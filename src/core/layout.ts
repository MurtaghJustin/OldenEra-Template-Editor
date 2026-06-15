import type { Graph } from "./graph";
import type { Variant } from "./types";

const L = 160;             // natural spring length (ideal edge length)
const KS = 0.08;           // spring stiffness (Hooke attraction)
const KR = 300000;         // repulsion constant (Coulomb)
const ITERATIONS = 400;
const COMPONENT_GAP = 180; // horizontal gap between disconnected components
const ORIGIN = 100;        // padding so all coordinates are positive
const EPS = 0.01;

interface P { x: number; y: number; }

/**
 * Deterministic force-directed (Fruchterman–Reingold) layout of the zone graph.
 *
 * The .rmg.json format stores no node positions and the map is randomly rotated in-game,
 * so this only needs to produce a stable, readable embedding for the editor canvas and the
 * preview PNG. A force-directed model is used (rather than a radial/ring heuristic) because
 * it faithfully renders arbitrary topologies — crosses as crosses, ring maps as rings,
 * dumbbell/tournament maps as two clusters — instead of collapsing them.
 *
 * Determinism: nodes are seeded on a circle ordered by id and refined over a fixed number of
 * iterations with a fixed cooling schedule. There is no randomness, so the same graph always
 * yields the same layout (required for a reproducible preview image).
 */
export function autoLayout(g: Graph, _variant?: Variant): Graph {
  const n = g.nodes.length;
  if (n === 0) return g;

  const index = new Map<string, number>();
  g.nodes.forEach((nd, i) => index.set(nd.id, i));

  // Two deduped, undirected, self-loop-free pair sets:
  //  - springPairs: only the drawn ROAD graph (everything except Proximity). These are the
  //    attractive springs that shape the layout, matching the preview images (the "+ cross",
  //    diamonds, rings are road topology). Proximity is a non-traversable adjacency hint that
  //    over-connects zones into near-cliques, so including it would collapse the real shape.
  //  - allPairs: every connection incl. Proximity, used only for component connectivity so a
  //    zone joined to the map solely by Proximity isn't split off into its own cluster.
  const seenSpring = new Set<string>(), seenAll = new Set<string>();
  const springPairs: [number, number][] = [], allPairs: [number, number][] = [];
  for (const e of g.edges) {
    const a = index.get(e.from), b = index.get(e.to);
    if (a === undefined || b === undefined || a === b) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!seenAll.has(key)) { seenAll.add(key); allPairs.push([a, b]); }
    if (e.connection.connectionType !== "Proximity" && !seenSpring.has(key)) {
      seenSpring.add(key); springPairs.push([a, b]);
    }
  }

  // Connected components (union-find), so disconnected tournament maps neither overlap nor
  // fly apart under pure repulsion — each is laid out on its own, then packed side by side.
  const parent = g.nodes.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (const [a, b] of allPairs) parent[find(a)] = find(b);
  const compMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    (compMap.get(r) ?? compMap.set(r, []).get(r)!).push(i);
  }
  // Deterministic component order: by smallest member id.
  const components = [...compMap.values()].sort(
    (c1, c2) => g.nodes[c1[0]].id.localeCompare(g.nodes[c2[0]].id)
  );

  const pos: P[] = g.nodes.map(() => ({ x: 0, y: 0 }));

  let packX = ORIGIN;
  for (const comp of components) {
    const members = [...comp].sort((a, b) => g.nodes[a].id.localeCompare(g.nodes[b].id));
    layoutComponent(members, springPairs, allPairs, pos);

    // Normalise to positive coords and pack components left-to-right.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const i of members) {
      minX = Math.min(minX, pos[i].x); maxX = Math.max(maxX, pos[i].x);
      minY = Math.min(minY, pos[i].y); maxY = Math.max(maxY, pos[i].y);
    }
    for (const i of members) {
      pos[i].x += packX - minX;
      pos[i].y += ORIGIN - minY;
    }
    packX += (maxX - minX) + COMPONENT_GAP;
  }

  g.nodes.forEach((nd, i) => { nd.x = pos[i].x; nd.y = pos[i].y; });
  return g;
}

function layoutComponent(members: number[], springPairs: [number, number][], allPairs: [number, number][], pos: P[]): void {
  const count = members.length;
  if (count === 1) { pos[members[0]] = { x: 0, y: 0 }; return; }

  const inComp = new Set(members);
  // Attract along road springs; if this component is held together only by Proximity
  // (no road edges), fall back to all pairs so it doesn't blow apart under repulsion.
  let compEdges = springPairs.filter(([a, b]) => inComp.has(a) && inComp.has(b));
  if (compEdges.length === 0) compEdges = allPairs.filter(([a, b]) => inComp.has(a) && inComp.has(b));

  // Seed on a circle (deterministic), radius scaled by component size.
  const radius = L * Math.max(1, Math.sqrt(count));
  members.forEach((i, p) => {
    const angle = (2 * Math.PI * p) / count;
    pos[i].x = radius * Math.cos(angle);
    pos[i].y = radius * Math.sin(angle);
  });

  // Eades spring-electrical model: Hooke springs (linear, bounded — cannot explode) pull
  // adjacent nodes toward the natural length L; Coulomb repulsion (KR/d², decays with distance)
  // spreads all pairs. A per-iteration step cap with multiplicative cooling settles it.
  const disp = new Map<number, P>(members.map((i) => [i, { x: 0, y: 0 }]));
  let step = L;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const d of disp.values()) { d.x = 0; d.y = 0; }

    // Coulomb repulsion between every pair in the component.
    for (let p = 0; p < count; p++) {
      for (let q = p + 1; q < count; q++) {
        const i = members[p], j = members[q];
        let dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
        let d = Math.hypot(dx, dy);
        if (d < EPS) { dx = (p - q) * EPS; dy = EPS; d = Math.hypot(dx, dy); } // break exact overlaps deterministically
        const f = KR / (d * d), ux = dx / d, uy = dy / d;
        const di = disp.get(i)!, dj = disp.get(j)!;
        di.x += ux * f; di.y += uy * f;
        dj.x -= ux * f; dj.y -= uy * f;
      }
    }
    // Hooke attraction along edges (f = ks*(d - L): pulls when stretched, pushes when compressed).
    for (const [a, b] of compEdges) {
      let dx = pos[a].x - pos[b].x, dy = pos[a].y - pos[b].y;
      let d = Math.hypot(dx, dy);
      if (d < EPS) d = EPS;
      const f = KS * (d - L), ux = dx / d, uy = dy / d;
      const da = disp.get(a)!, db = disp.get(b)!;
      da.x -= ux * f; da.y -= uy * f;
      db.x += ux * f; db.y += uy * f;
    }
    // Apply displacement, capped by the current step size.
    for (const i of members) {
      const dd = disp.get(i)!;
      const len = Math.hypot(dd.x, dd.y);
      if (len < EPS) continue;
      const lim = Math.min(len, step);
      pos[i].x += (dd.x / len) * lim;
      pos[i].y += (dd.y / len) * lim;
    }
    step = Math.max(step * 0.97, 1);
  }
}
