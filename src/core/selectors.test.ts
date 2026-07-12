import { describe, it, expect } from "vitest";
import {
  parseDifferentFrom, formatDifferentFrom, splitFromListArgs,
  parseBiome, buildBiome, parseFaction, buildFaction,
} from "./selectors";
import type { Selector } from "./types";

describe("differentFrom grammar", () => {
  it("parses bare-zone, indexed, and comma-packed forms", () => {
    expect(parseDifferentFrom("differentFrom: Spawn-A")).toEqual([{ zone: "Spawn-A", index: undefined }]);
    expect(parseDifferentFrom("differentFrom: 1 Spawn-A")).toEqual([{ zone: "Spawn-A", index: 1 }]);
    // Symphony's comma-packed single element with trailing whitespace:
    expect(parseDifferentFrom("differentFrom: Spawn-A, differentFrom: Zone-2 ")).toEqual([
      { zone: "Spawn-A", index: undefined }, { zone: "Zone-2", index: undefined },
    ]);
  });

  it("formats canonically (index only when present)", () => {
    expect(formatDifferentFrom({ zone: "Spawn-A" })).toBe("differentFrom: Spawn-A");
    expect(formatDifferentFrom({ zone: "Spawn-A", index: 0 })).toBe("differentFrom: 0 Spawn-A");
  });

  it("splits FromList args into names and exclusions", () => {
    const { names, exclusions } = splitFromListArgs(["Grass", "Sand", "differentFrom: Spawn-A"]);
    expect(names).toEqual(["Grass", "Sand"]);
    expect(exclusions).toEqual([{ zone: "Spawn-A", index: undefined }]);
  });
});

describe("biome selector parse/build", () => {
  const round = (sel: Selector) => buildBiome(parseBiome(sel));
  it("FromList: any (empty) and specific biomes round-trip", () => {
    expect(parseBiome({ type: "FromList", args: [] }).mode).toBe("any");
    expect(round({ type: "FromList", args: [] })).toEqual({ type: "FromList", args: [] });
    const st = parseBiome({ type: "FromList", args: ["Sand"] });
    expect(st).toMatchObject({ mode: "list", biomes: ["Sand"] });
    expect(round({ type: "FromList", args: ["Grass", "Sand", "differentFrom: Spawn-A"] }))
      .toEqual({ type: "FromList", args: ["Grass", "Sand", "differentFrom: Spawn-A"] });
  });
  it("MatchMainObject → follow a main object", () => {
    expect(parseBiome({ type: "MatchMainObject", args: ["0"] })).toMatchObject({ mode: "followMainObject", index: 0 });
    expect(round({ type: "MatchMainObject", args: ["0"] })).toEqual({ type: "MatchMainObject", args: ["0"] });
  });
  it("MatchZone and bare-zone Match both read as 'same as zone'", () => {
    expect(parseBiome({ type: "MatchZone", args: ["Spawn-A"] })).toMatchObject({ mode: "sameAsZone", zone: "Spawn-A" });
    expect(parseBiome({ type: "Match", args: ["Side-A"] })).toMatchObject({ mode: "sameAsZone", zone: "Side-A" });
    // Editing a bare-zone Match canonicalizes it to MatchZone:
    expect(round({ type: "Match", args: ["Side-A"] })).toEqual({ type: "MatchZone", args: ["Side-A"] });
  });
});

describe("faction selector parse/build", () => {
  const round = (sel: Selector) => buildFaction(parseFaction(sel));
  it("FromList differentFrom (indexed) round-trips", () => {
    const st = parseFaction({ type: "FromList", args: ["differentFrom: 0 Spawn-A", "differentFrom: 0 Spawn-B"] });
    expect(st.mode).toBe("any");
    expect(st.exclusions).toEqual([{ zone: "Spawn-A", index: 0 }, { zone: "Spawn-B", index: 0 }]);
    expect(round({ type: "FromList", args: ["differentFrom: 0 Spawn-A"] })).toEqual({ type: "FromList", args: ["differentFrom: 0 Spawn-A"] });
  });
  it("Match with index + optional zone", () => {
    expect(parseFaction({ type: "Match", args: ["0", "Spawn-A"] })).toMatchObject({ mode: "match", index: 0, zone: "Spawn-A" });
    expect(round({ type: "Match", args: ["0", "Spawn-A"] })).toEqual({ type: "Match", args: ["0", "Spawn-A"] });
    expect(round({ type: "Match", args: ["0"] })).toEqual({ type: "Match", args: ["0"] });
  });
  it("Random round-trips", () => {
    expect(parseFaction({ type: "Random", args: [] }).mode).toBe("random");
    expect(round({ type: "Random", args: [] })).toEqual({ type: "Random", args: [] });
  });
});
