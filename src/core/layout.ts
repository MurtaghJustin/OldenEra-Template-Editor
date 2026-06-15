import type { Graph } from "./graph";
import type { Variant } from "./types";

const L = 160;             // natural spring length (ideal edge length)
const KS = 0.08;           // spring stiffness (Hooke attraction)
const KR = 300000;         // repulsion constant (Coulomb)
const KG = 0.1;            // gravity toward component centroid (general compactness)
const TUCK_GRAVITY = 8;    // gravity multiplier for pendants that should sit inside a loop
const ITERATIONS = 400;
const SPECTRAL_ITERS = 500; // power-iteration steps for the spectral (Laplacian eigenvector) seed
const RANDOM_RESTARTS = 16;  // deterministic random fallback seeds for graphs the seeds can't untangle
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

// If `nodes` form a single simple cycle under the given within-set adjacency (every node has
// exactly two neighbours, all in one loop), return them in cycle order; otherwise null. Used to
// pin a ring on a perfect regular polygon. Deterministic: start at the lowest-id node, break the
// first fork by id rank.
function walkCycle(nodes: number[], cadj: Map<number, number[]>, rank: Map<number, number>): number[] | null {
  if (nodes.length < 3) return null;
  for (const m of nodes) if ((cadj.get(m)?.length ?? 0) !== 2) return null;
  const start = nodes.reduce((a, b) => (rank.get(a)! <= rank.get(b)! ? a : b));
  const order = [start]; const seen = new Set([start]);
  let prev = -1, cur = start;
  while (order.length < nodes.length) {
    const cand = cadj.get(cur)!.filter((x) => x !== prev && !seen.has(x));
    if (!cand.length) break;
    const next = cand.reduce((a, b) => (rank.get(a)! <= rank.get(b)! ? a : b));
    order.push(next); seen.add(next); prev = cur; cur = next;
  }
  return order.length === nodes.length ? order : null;
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
  // Player spawns are excluded: they're player starts and belong on the periphery, never sucked
  // into a loop interior (e.g. Christmas Tree's apex spawn hangs off a dense grid with no room).
  const tuck = new Set<number>(members.filter((m) => !isSpawn[m] && adj.get(m)!.length === 1 && core.has(adj.get(m)![0])));

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

  // Two fully deterministic candidate seeds, each refined by the force pass; keep whichever has
  // the fewest edge crossings. The structured circle seed is first, so it wins ties — preserving
  // the clean ring/cross/chain layouts. The spectral seed (Laplacian eigenvectors) places nodes by
  // graph structure, so symmetric/grid graphs (Blitz, Full Hire, Hallway) come out symmetric and
  // untangled rather than landing in an arbitrary local minimum.
  // Tuck (pulling loop-pendants inside) helps the structured layout but disrupts the spectral one,
  // which already places nodes by structure (forcing pendants inward there just tangles dense
  // cores, e.g. Hallway). So tuck applies only to the structured/polygon candidates.
  const candidates: { init: Map<number, P>; tuck: Set<number>; pinned: Set<number> }[] = [];

  // Pin a recognizable ring on a perfect regular polygon (exactly even edges & angles), instead of
  // the slightly-irregular, slightly-tilted approximation force-directed produces (which reads as
  // "wonky"). Two cases:
  //  (a) the cycle core is itself a single simple loop (Exodus's 4-cycle, Harmony's 8-cycle);
  //  (b) a WHEEL — one hub joined to every other node, the rest forming a ring (Eye of the Storm):
  //      the rim becomes the polygon and the hub is pinned dead-centre.
  // Remaining pendants/branches settle around the fixed ring (loop-pendants tuck to the centre).
  let ringOrder: number[] | null = null;
  let centerNodes: number[] = [];
  const coreNodes = [...core];
  const coreAdj = new Map(coreNodes.map((m) => [m, adj.get(m)!.filter((x) => core.has(x))]));
  ringOrder = walkCycle(coreNodes, coreAdj, rank);
  if (!ringOrder) {
    const hub = members.find((m) => adj.get(m)!.length === count - 1);
    if (hub !== undefined) {
      const rim = members.filter((m) => m !== hub);
      const rimSet = new Set(rim);
      const rimAdj = new Map(rim.map((m) => [m, adj.get(m)!.filter((x) => rimSet.has(x))]));
      const ro = walkCycle(rim, rimAdj, rank);
      if (ro) { ringOrder = ro; centerNodes = [hub]; }
    }
  }
  if (ringOrder) {
    const k = ringOrder.length;
    const R = L / (2 * Math.sin(Math.PI / k));
    const polygon = new Map<number, P>();
    // Orient the ring: by default the first node sits at the top. If the ring carries exactly two
    // player spawns, rotate so they sit LEVEL (same height) — placed symmetric about the vertical
    // axis by rotating the near-bisector of their directions straight down (Harmony's hexagon/
    // octagon, Eye of the Storm). Opposite spawns (bisector undefined) go to left/right. Single-
    // spawn rings (Exodus's diamonds) keep the default orientation.
    let phase = -Math.PI / 2;
    const spawnSlots = ringOrder.map((idx, slot) => (isSpawn[idx] ? slot : -1)).filter((s) => s >= 0);
    if (spawnSlots.length === 2) {
      const a1 = (2 * Math.PI * spawnSlots[0]) / k, a2 = (2 * Math.PI * spawnSlots[1]) / k;
      const bx = Math.cos(a1) + Math.cos(a2), by = Math.sin(a1) + Math.sin(a2);
      phase = Math.hypot(bx, by) > 1e-6 ? (3 * Math.PI) / 2 - Math.atan2(by, bx) : Math.PI - a1;
    }
    ringOrder.forEach((idx, slot) => {
      const angle = (2 * Math.PI * slot) / k + phase;
      polygon.set(idx, { x: R * Math.cos(angle), y: R * Math.sin(angle) });
    });
    for (const h of centerNodes) polygon.set(h, { x: 0, y: 0 });
    let o = 0.1;
    for (const m of members) {
      if (polygon.has(m)) continue;
      const cn = adj.get(m)!.filter((x) => polygon.has(x)); // seed near its attachment on the ring
      let bx = 0, by = 0;
      if (cn.length) { for (const nb of cn) { bx += polygon.get(nb)!.x; by += polygon.get(nb)!.y; } bx /= cn.length; by /= cn.length; }
      polygon.set(m, { x: bx + Math.cos(o), y: by + Math.sin(o) });
      o += 1.7;
    }
    candidates.push({ init: polygon, tuck, pinned: new Set([...ringOrder, ...centerNodes]) });
  }

  const structured = new Map<number, P>();
  order.forEach((idx, slot) => {
    const angle = (2 * Math.PI * slot) / count;
    structured.set(idx, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  });
  candidates.push({ init: structured, tuck, pinned: new Set() });

  const spec = spectralSeed(members, compEdges, count);
  if (spec) candidates.push({ init: spec, tuck: new Set(), pinned: new Set() });
  // Deterministic random restarts as a FALLBACK (tried after the seeds above, so those win ties and
  // keep their clean layouts). These rescue graphs none of the seeds untangle — e.g. Clover.
  for (let t = 1; t <= RANDOM_RESTARTS; t++) {
    const init = new Map<number, P>();
    for (const idx of members) init.set(idx, { x: (rand(idx, t, 1) * 2 - 1) * radius, y: (rand(idx, t, 2) * 2 - 1) * radius });
    candidates.push({ init, tuck: new Set(), pinned: new Set() });
  }

  let best: Map<number, P> | null = null;
  let bestCrossings = Infinity;
  for (const cand of candidates) {
    const result = simulate(members, compEdges, cand.tuck, count, cand.init, cand.pinned);
    const crossings = countCrossings(compEdges, result);
    if (crossings < bestCrossings) { bestCrossings = crossings; best = result; }
    if (bestCrossings === 0) break; // can't do better than crossing-free
  }

  // Canonical orientation: rotate the whole component so its player spawns are symmetric about the
  // vertical axis (upright). Force-directed often lands a regular shape at an odd tilt — e.g.
  // Fair'n Square's spawns form a perfect square rotated ~23°. Rotation preserves the shape and
  // crossings; it just makes symmetric multi-spawn maps sit straight (spawns at corners/edges of a
  // square, points of a hexagon, …). Only for 3+ spawns, so 2-spawn rings keep their leveled
  // orientation and single-spawn components are untouched.
  const phi = uprightRotation(members, isSpawn, best!);
  if (phi !== 0) {
    let cx = 0, cy = 0;
    for (const m of members) { const p = best!.get(m)!; cx += p.x; cy += p.y; }
    cx /= count; cy /= count;
    const c = Math.cos(phi), s = Math.sin(phi);
    for (const m of members) {
      const p = best!.get(m)!, dx = p.x - cx, dy = p.y - cy;
      p.x = cx + dx * c - dy * s; p.y = cy + dx * s + dy * c;
    }
  }
  for (const idx of members) { pos[idx].x = best!.get(idx)!.x; pos[idx].y = best!.get(idx)!.y; }
}

// Rotation (radians) that makes the component's player spawns most symmetric about the vertical
// axis — i.e. orients a tilted-but-regular spawn arrangement upright. Returns 0 for <3 spawns.
function uprightRotation(members: number[], isSpawn: boolean[], pos: Map<number, P>): number {
  const spawns = members.filter((m) => isSpawn[m]);
  if (spawns.length < 3) return 0;
  let cx = 0, cy = 0;
  for (const m of members) { const p = pos.get(m)!; cx += p.x; cy += p.y; }
  cx /= members.length; cy /= members.length;
  const sv = spawns.map((m) => ({ x: pos.get(m)!.x - cx, y: pos.get(m)!.y - cy }));
  let bestPhi = 0, bestScore = Infinity;
  for (let deg = 0; deg < 180; deg++) {
    const phi = (deg * Math.PI) / 180, c = Math.cos(phi), s = Math.sin(phi);
    const rot = sv.map((v) => ({ x: v.x * c - v.y * s, y: v.x * s + v.y * c }));
    let score = 0;
    for (const p of rot) {
      let nearest = Infinity;
      for (const q of rot) nearest = Math.min(nearest, Math.hypot(-p.x - q.x, p.y - q.y)); // mirror over vertical axis
      score += nearest;
    }
    score += deg * 1e-4; // prefer the smallest rotation among equally-symmetric orientations
    if (score < bestScore) { bestScore = score; bestPhi = phi; }
  }
  return bestPhi;
}

// Deterministic pseudo-random in [0,1) from integer inputs (no Math.random, so layouts stay
// reproducible across runs — required for a stable preview image).
function rand(a: number, b: number, c: number): number {
  const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

// Spectral seed: positions from the 2nd & 3rd smallest eigenvectors of the graph Laplacian
// (smallest is the trivial constant vector). This respects graph structure and symmetry — rings
// map to circles, grids to grids, symmetric graphs to symmetric layouts — giving force-directed a
// deterministic, untangled starting point. Eigenvectors via power iteration on B = cI - L (whose
// largest eigenvectors are L's smallest), deflating the constant vector. Returns null for tiny
// components where it isn't meaningful.
function spectralSeed(members: number[], compEdges: [number, number][], count: number): Map<number, P> | null {
  if (count < 4) return null;
  const loc = new Map(members.map((m, i) => [m, i]));
  const ladj: number[][] = members.map(() => []);
  for (const [a, b] of compEdges) { const la = loc.get(a)!, lb = loc.get(b)!; ladj[la].push(lb); ladj[lb].push(la); }
  const deg = ladj.map((a) => a.length);
  const c = 2 * Math.max(...deg) + 1;
  const dot = (u: number[], v: number[]) => { let s = 0; for (let i = 0; i < count; i++) s += u[i] * v[i]; return s; };
  const bMul = (v: number[]) => v.map((vi, i) => c * vi - (deg[i] * vi - ladj[i].reduce((s, j) => s + v[j], 0)));
  const normalize = (v: number[]) => { const m = Math.sqrt(dot(v, v)) || 1; return v.map((x) => x / m); };
  const orth = (v: number[], basis: number[][]) => {
    const r = v.slice();
    for (const u of basis) { const d = dot(r, u); for (let i = 0; i < count; i++) r[i] -= d * u[i]; }
    return r;
  };
  const power = (basis: number[][]) => {
    let v = normalize(orth(members.map((_, i) => Math.sin(i * 1.7 + 0.3)), basis));
    for (let it = 0; it < SPECTRAL_ITERS; it++) v = normalize(orth(bMul(v), basis));
    return v;
  };
  const ones = normalize(new Array(count).fill(1));
  const f1 = power([ones]);
  const f2 = power([ones, f1]);
  const span = (a: number[]) => (Math.max(...a) - Math.min(...a)) || 1;
  const s = L * Math.sqrt(count), sx = span(f1), sy = span(f2);
  const seed = new Map<number, P>();
  members.forEach((m, i) => seed.set(m, { x: (f1[i] / sx) * s, y: (f2[i] / sy) * s }));
  return seed;
}

// Number of drawn-edge pairs whose segments properly cross (shared endpoints don't count).
function countCrossings(edges: [number, number][], pos: Map<number, P>): number {
  const orient = (a: P, b: P, c: P) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  let n = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a1, a2] = edges[i], [b1, b2] = edges[j];
      if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue;
      const p1 = pos.get(a1)!, p2 = pos.get(a2)!, p3 = pos.get(b1)!, p4 = pos.get(b2)!;
      const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2), d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) n++;
    }
  }
  return n;
}

// Eades spring-electrical relaxation from a given initial layout. Hooke springs (linear, bounded —
// cannot explode) pull adjacent nodes toward the natural length L; Coulomb repulsion (KR/d²,
// decays with distance) spreads all pairs; centroid gravity compacts and tucks loop-pendants.
// A per-iteration step cap with multiplicative cooling settles it. Returns the final positions.
// `pinned` nodes still exert forces but never move (used to hold a cycle on a fixed polygon).
function simulate(members: number[], compEdges: [number, number][], tuck: Set<number>, count: number, init: Map<number, P>, pinned: Set<number>): Map<number, P> {
  const pos = new Map<number, P>(members.map((i) => [i, { x: init.get(i)!.x, y: init.get(i)!.y }]));
  const disp = new Map<number, P>(members.map((i) => [i, { x: 0, y: 0 }]));
  let step = L;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const d of disp.values()) { d.x = 0; d.y = 0; }

    for (let p = 0; p < count; p++) {
      for (let q = p + 1; q < count; q++) {
        const i = members[p], j = members[q];
        const pi = pos.get(i)!, pj = pos.get(j)!;
        let dx = pi.x - pj.x, dy = pi.y - pj.y;
        let d = Math.hypot(dx, dy);
        if (d < EPS) { dx = (p - q) * EPS; dy = EPS; d = Math.hypot(dx, dy); }
        const f = KR / (d * d), ux = dx / d, uy = dy / d;
        const di = disp.get(i)!, dj = disp.get(j)!;
        di.x += ux * f; di.y += uy * f;
        dj.x -= ux * f; dj.y -= uy * f;
      }
    }
    for (const [a, b] of compEdges) {
      const pa = pos.get(a)!, pb = pos.get(b)!;
      let dx = pa.x - pb.x, dy = pa.y - pb.y;
      let d = Math.hypot(dx, dy);
      if (d < EPS) d = EPS;
      const f = KS * (d - L), ux = dx / d, uy = dy / d;
      const da = disp.get(a)!, db = disp.get(b)!;
      da.x -= ux * f; da.y -= uy * f;
      db.x += ux * f; db.y += uy * f;
    }
    let cx = 0, cy = 0;
    for (const i of members) { const pi = pos.get(i)!; cx += pi.x; cy += pi.y; }
    cx /= count; cy /= count;
    for (const i of members) {
      const pi = pos.get(i)!, dd = disp.get(i)!;
      const g = tuck.has(i) ? KG * TUCK_GRAVITY : KG;
      dd.x += (cx - pi.x) * g; dd.y += (cy - pi.y) * g;
    }
    for (const i of members) {
      if (pinned.has(i)) continue; // held fixed (e.g. on a regular polygon)
      const pi = pos.get(i)!, dd = disp.get(i)!;
      const len = Math.hypot(dd.x, dd.y);
      if (len < EPS) continue;
      const lim = Math.min(len, step);
      pi.x += (dd.x / len) * lim; pi.y += (dd.y / len) * lim;
    }
    step = Math.max(step * 0.97, 1);
  }
  return pos;
}
