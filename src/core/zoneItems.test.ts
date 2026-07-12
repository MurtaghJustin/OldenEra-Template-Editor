import { describe, it, expect } from "vitest";
import {
  resolveZoneItems, countZonesReferencing, editablePoolsForCategory, editableMandatoryGroups,
  addObjectToPoolDef, patchPoolObjectInDef, removePoolObjectFromDef,
  addItemToMandatoryDef, patchMandatoryItemInDef, removeMandatoryItemFromDef,
  makeZonePoolDef, type ObjectRow, type ListChipRow, type BuiltinRefRow,
} from "./zoneItems";
import type { TemplateRoot, Zone } from "./types";

// A root with the given content defs and a single zone wired to them.
function buildRoot(opts: {
  pools?: Record<string, unknown>[];
  lists?: Record<string, unknown>[];
  mandatory?: Record<string, unknown>[];
  zone?: Partial<Zone>;
  extraZones?: Partial<Zone>[];
}): { root: TemplateRoot; zone: Zone } {
  const zone = { name: "Z", size: 1, layout: "l", ...opts.zone } as Zone;
  const root = {
    name: "T", gameMode: "Classic", sizeX: 96, sizeZ: 96, gameRules: {},
    contentPools: opts.pools ?? [], contentLists: opts.lists ?? [], mandatoryContent: opts.mandatory ?? [],
    variants: [{ zones: [zone, ...((opts.extraZones ?? []).map((z) => ({ name: "X", size: 1, layout: "l", ...z })))], connections: [] }],
  } as unknown as TemplateRoot;
  return { root, zone };
}

describe("resolveZoneItems", () => {
  it("flattens inline pool objects with derived category/guarded and precise source", () => {
    const { root, zone } = buildRoot({
      pools: [{ name: "gp", groups: [{ content: [{ sid: "bank", weight: 100, variant: 2 }, { sid: "crypt", weight: 80 }] }] }],
      zone: { guardedContentPool: ["gp"] },
    });
    const rows = resolveZoneItems(root, zone).filter((r): r is ObjectRow => r.kind === "object");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      sid: "bank", weight: 100, variant: 2, category: "guarded", guaranteed: false, guarded: true, editable: true,
      source: { defKind: "pools", poolName: "gp", groupIndex: 0, contentIndex: 0 },
    });
    expect(rows[1].source).toMatchObject({ contentIndex: 1 });
  });

  it("marks unguarded pool objects guarded:false and resources guarded:undefined", () => {
    const { root, zone } = buildRoot({
      pools: [
        { name: "up", groups: [{ content: [{ sid: "u" }] }] },
        { name: "rp", groups: [{ content: [{ sid: "r" }] }] },
      ],
      zone: { unguardedContentPool: ["up"], resourcesContentPool: ["rp"] },
    });
    const rows = resolveZoneItems(root, zone).filter((r): r is ObjectRow => r.kind === "object");
    expect(rows.find((r) => r.sid === "u")).toMatchObject({ category: "unguarded", guarded: false });
    expect(rows.find((r) => r.sid === "r")!.guarded).toBeUndefined();
  });

  it("renders includeLists as collapsed chips with the list's object count", () => {
    const { root, zone } = buildRoot({
      pools: [{ name: "gp", groups: [{ includeLists: ["dwellings", "builtin_list"], content: [] }] }],
      lists: [{ name: "dwellings", content: [{ sid: "a" }, { sid: "b" }, { sid: "c" }] }],
      zone: { guardedContentPool: ["gp"] },
    });
    const chips = resolveZoneItems(root, zone).filter((r): r is ListChipRow => r.kind === "list");
    expect(chips).toHaveLength(2);
    expect(chips[0]).toMatchObject({ listName: "dwellings", category: "guarded", objectCount: 3, editable: false });
    expect(chips[1]).toMatchObject({ listName: "builtin_list", objectCount: null }); // not defined here
  });

  it("emits a builtinRef row for a referenced pool not defined in the template", () => {
    const { root, zone } = buildRoot({ zone: { guardedContentPool: ["some_builtin_pool"] } });
    const rows = resolveZoneItems(root, zone);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject<Partial<BuiltinRefRow>>({ kind: "builtinRef", name: "some_builtin_pool", category: "guarded", refKind: "pools", editable: false });
  });

  it("flattens mandatory items (guaranteed, isGuarded/mine/solo) and their includeLists", () => {
    const { root, zone } = buildRoot({
      mandatory: [{ name: "mg", content: [
        { sid: "dragon_utopia", isGuarded: true, isMine: false, soloEncounter: true },
        { includeLists: ["relics"] },
      ] }],
      lists: [{ name: "relics", content: [{ sid: "x" }] }],
      zone: { mandatoryContent: ["mg"] },
    });
    const rows = resolveZoneItems(root, zone);
    const obj = rows.find((r): r is ObjectRow => r.kind === "object")!;
    expect(obj).toMatchObject({
      sid: "dragon_utopia", category: "mandatory", guaranteed: true, guarded: true, soloEncounter: true, editable: true,
      source: { defKind: "mandatory", groupName: "mg", itemIndex: 0 },
    });
    const chip = rows.find((r): r is ListChipRow => r.kind === "list")!;
    expect(chip).toMatchObject({ listName: "relics", category: "mandatory", objectCount: 1 });
  });

  it("a list-only mandatory item (empty sid + includeLists) shows as a chip, not a blank object row", () => {
    // The real "pull one object from this list" idiom, seen in Warlords' mandatory_content_crossroads.
    const { root, zone } = buildRoot({
      mandatory: [{ name: "mg", content: [
        { sid: "mine_gold", isGuarded: true },
        { sid: "", includeLists: ["banks_tier_2"], isGuarded: false },
      ] }],
      zone: { mandatoryContent: ["mg"] },
    });
    const rows = resolveZoneItems(root, zone);
    expect(rows.filter((r) => r.kind === "object")).toHaveLength(1);          // only mine_gold
    expect((rows.find((r): r is ObjectRow => r.kind === "object"))!.sid).toBe("mine_gold");
    expect(rows.filter((r) => r.kind === "list")).toHaveLength(1);            // the list chip
  });
});

describe("reference helpers", () => {
  it("countZonesReferencing counts zones across the variant", () => {
    const { root } = buildRoot({
      pools: [{ name: "gp", groups: [] }],
      zone: { guardedContentPool: ["gp"] },
      extraZones: [{ name: "X", guardedContentPool: ["gp"] }, { name: "Y", guardedContentPool: ["other"] }],
    });
    expect(countZonesReferencing(root, "pools", "gp")).toBe(2);
    expect(countZonesReferencing(root, "pools", "other")).toBe(1);
  });

  it("editablePoolsForCategory / editableMandatoryGroups skip built-in (undefined) names", () => {
    const { root, zone } = buildRoot({
      pools: [{ name: "tpl", groups: [] }],
      mandatory: [{ name: "mg", content: [] }],
      zone: { guardedContentPool: ["builtin_a", "tpl", "builtin_b"], mandatoryContent: ["mg", "builtin_mg"] },
    });
    expect(editablePoolsForCategory(root, zone, "guarded")).toEqual(["tpl"]);
    expect(editableMandatoryGroups(root, zone)).toEqual(["mg"]);
  });
});

describe("pure mutations", () => {
  it("addObjectToPoolDef creates a first group when none exists", () => {
    const def = addObjectToPoolDef({ name: "p", groups: [] }, { sid: "a" });
    const groups = def.groups as { content: unknown[] }[];
    expect(groups).toHaveLength(1);
    expect(groups[0].content).toEqual([{ weight: 100, sid: "a" }]);
  });

  it("addObjectToPoolDef appends to the existing first group and does not mutate the input", () => {
    const input = { name: "p", groups: [{ content: [{ sid: "a" }] }] };
    const def = addObjectToPoolDef(input, { sid: "b", weight: 50 });
    expect((def.groups as { content: unknown[] }[])[0].content).toEqual([{ sid: "a" }, { weight: 50, sid: "b" }]);
    expect(input.groups[0].content).toHaveLength(1); // input untouched
  });

  it("patch/remove pool object target the right group+index", () => {
    const def0 = { name: "p", groups: [{ content: [{ sid: "a", weight: 1 }, { sid: "b", weight: 2 }] }] };
    const patched = patchPoolObjectInDef(def0, 0, 1, { weight: 99 });
    expect((patched.groups as { content: { weight: number }[] }[])[0].content[1].weight).toBe(99);
    const removed = removePoolObjectFromDef(def0, 0, 0);
    expect((removed.groups as { content: { sid: string }[] }[])[0].content.map((c) => c.sid)).toEqual(["b"]);
  });

  it("mandatory add/patch/remove operate on content[]", () => {
    const added = addItemToMandatoryDef({ name: "m", content: [] }, { sid: "a" });
    expect(added.content).toEqual([{ sid: "a" }]);
    const patched = patchMandatoryItemInDef(added, 0, { isGuarded: true });
    expect((patched.content as { isGuarded: boolean }[])[0].isGuarded).toBe(true);
    const removed = removeMandatoryItemFromDef(patched, 0);
    expect(removed.content).toEqual([]);
  });

  it("makeZonePoolDef names the pool after the zone+category, de-duplicated", () => {
    const { root } = buildRoot({ pools: [{ name: "Z_guarded", groups: [] }] });
    expect(makeZonePoolDef(root, "Z", "guarded").name).toBe("Z_guarded-2");
    expect(makeZonePoolDef(root, "Z", "unguarded").name).toBe("Z_unguarded");
  });
});
