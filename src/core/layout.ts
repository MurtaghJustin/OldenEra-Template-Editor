import type { Graph } from "./graph";
import type { Variant } from "./types";

const L = 160;             // natural spring length (ideal edge length)
const KS = 0.08;           // spring stiffness (Hooke attraction)
const KR = 300000;         // repulsion constant (Coulomb)
const KG = 0.1;            // gravity toward component centroid (general compactness)
const TUCK_GRAVITY = 8;    // gravity multiplier for pendants that should sit inside a loop
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
  const isSpawn = g.nodes.map((nd) => nd.playerSlot !== undefined);

  // Deduped, undirected, self-loop-free ROAD pairs (everything except Proximity). Proximity is a
  // non-traversable adjacency hint — NOT a path — so it drives neither the layout springs nor
  // connectivity. Using only roads means genuinely separate areas (e.g. the two halves of a
  // tournament map like Exodus, which share only Proximity hints) come out as separate clusters.
  const seenSpring = new Set<string>();
  const springPairs: [number, number][] = [];
  for (const e of g.edges) {
    const a = index.get(e.from), b = index.get(e.to);
    if (a === undefined || b === undefined || a === b) continue;
    if (e.connection.connectionType === "Proximity") continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!seenSpring.has(key)) { seenSpring.add(key); springPairs.push([a, b]); }
  }

  // Connected components of the ROAD graph (union-find): each is laid out on its own and packed
  // side by side, so separate areas neither overlap nor stretch apart under shared repulsion.
  const parent = g.nodes.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (const [a, b] of springPairs) parent[find(a)] = find(b);
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
    layoutComponent(members, springPairs, isSpawn, pos);

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

// The 2-core: nodes remaining after iteratively stripping degree-1 nodes — i.e. those that lie
// on a cycle. Empty for trees/stars/chains.
function twoCore(members: number[], adj: Map<number, number[]>): Set<number> {
  const deg = new Map(members.map((m) => [m, adj.get(m)!.length]));
  const removed = new Set<number>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of members) {
      if (removed.has(m) || deg.get(m)! > 1) continue;
      removed.add(m); changed = true;
      for (const nb of adj.get(m)!) if (!removed.has(nb)) deg.set(nb, deg.get(nb)! - 1);
    }
  }
  return new Set(members.filter((m) => !removed.has(m)));
}

function layoutComponent(members: number[], springPairs: [number, number][], isSpawn: boolean[], pos: P[]): void {
  const count = members.length;
  if (count === 1) { pos[members[0]] = { x: 0, y: 0 }; return; }

  const inComp = new Set(members);
  // Road springs within this component (always non-empty: a multi-node road component is, by
  // definition, connected by road edges).
  const compEdges = springPairs.filter(([a, b]) => inComp.has(a) && inComp.has(b));

  // Decide the seed ORDER around the circle (the even polygon the forces settle into preserves
  // this cyclic order, so a good order yields a clean, crossing-free, symmetric layout).
  const adj = new Map<number, number[]>(members.map((m) => [m, []]));
  for (const [a, b] of compEdges) { adj.get(a)!.push(b); adj.get(b)!.push(a); }
  const rank = new Map<number, number>(members.map((m, i) => [m, i]));

  // "Tuck-in" pendants: a degree-1 zone hanging off a node that's part of a cycle (the 2-core).
  // These dangle outward under plain force-directed but should sit INSIDE the loop to use space
  // and fit the rectangle. Star arms (Jebus) are degree-1 too, but their hub is NOT in any cycle
  // (empty 2-core), so they're correctly excluded and stay spread out.
  const core = twoCore(members, adj);
  const tuck = new Set<number>(members.filter((m) => adj.get(m)!.length === 1 && core.has(adj.get(m)![0])));

  let order: number[];
  const isStar = members.some((m) => adj.get(m)!.length === count - 1);

  if (isStar) {
    // Star/hub (one zone roads to every other, e.g. Jebus Outcast): the leaves are
    // interchangeable, so spread player spawns evenly around the circle and fill the rest
    // between them. Forces settle into an even polygon that keeps spawns opposite/distributed.
    const spawns = members.filter((i) => isSpawn[i]);
    const others = members.filter((i) => !isSpawn[i]);
    order = new Array(count);
    const taken = new Array(count).fill(false);
    spawns.forEach((idx, s) => {
      let slot = Math.round((s * count) / spawns.length) % count;
      while (taken[slot]) slot = (slot + 1) % count;
      taken[slot] = true; order[slot] = idx;
    });
    let oi = 0;
    for (let slot = 0; slot < count; slot++) if (!taken[slot]) order[slot] = others[oi++];
  } else {
    // Structured graph (rings, chains, multi-cluster/tournament maps): seed by DFS so adjacent
    // zones stay contiguous on the circle. This keeps each cluster compact, walks a ring into a
    // clean polygon, and minimises crossings. Deterministic: start at the lowest-id member and
    // visit neighbours in id-rank order.
    order = [];
    const visited = new Set<number>();
    const stack = [members[0]];
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur); order.push(cur);
      const nbrs = adj.get(cur)!.filter((x) => !visited.has(x)).sort((a, b) => rank.get(b)! - rank.get(a)!);
      for (const nb of nbrs) stack.push(nb); // reverse-rank push -> lowest rank popped first
    }
    for (const m of members) if (!visited.has(m)) order.push(m); // road-disconnected stragglers
  }

  const radius = L * Math.max(1, Math.sqrt(count));
  order.forEach((idx, slot) => {
    const angle = (2 * Math.PI * slot) / count;
    pos[idx].x = radius * Math.cos(angle);
    pos[idx].y = radius * Math.sin(angle);
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
    // Gravity toward the component centroid: pulls loosely-attached nodes (a pendant dangling off
    // a loop) into the empty interior instead of out to the side, and keeps the whole component
    // compact so it fits the square the game renders it in. Uniform, so it preserves symmetric
    // shapes (a ring stays a ring, a cross a cross — just tighter).
    let cx = 0, cy = 0;
    for (const i of members) { cx += pos[i].x; cy += pos[i].y; }
    cx /= count; cy /= count;
    for (const i of members) {
      const dd = disp.get(i)!;
      const g = tuck.has(i) ? KG * TUCK_GRAVITY : KG; // pull loop-pendants firmly into the interior
      dd.x += (cx - pos[i].x) * g;
      dd.y += (cy - pos[i].y) * g;
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
