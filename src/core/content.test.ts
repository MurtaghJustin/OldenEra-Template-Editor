import { describe, it, expect } from "vitest";
import { contentDefs, newContentDef, uniqueContentName, CONTENT_ROOT_FIELD } from "./content";
import type { TemplateRoot } from "./types";

function rootWith(field: string, defs: { name: string }[]): TemplateRoot {
  return { name: "T", gameMode: "Classic", sizeX: 96, sizeZ: 96, gameRules: {}, variants: [], [field]: defs } as unknown as TemplateRoot;
}

describe("content definitions", () => {
  it("reads definitions of each kind from the matching root field", () => {
    const root = rootWith(CONTENT_ROOT_FIELD.pools, [{ name: "pool_a" }, { name: "pool_b" }]);
    expect(contentDefs(root, "pools").map((d) => d.name)).toEqual(["pool_a", "pool_b"]);
    expect(contentDefs(root, "lists")).toEqual([]);   // absent field → empty
    expect(contentDefs(null, "pools")).toEqual([]);
  });

  it("creates minimal valid skeletons per kind", () => {
    expect(newContentDef("pools", "p")).toEqual({ name: "p", groups: [] });
    expect(newContentDef("lists", "l")).toEqual({ name: "l", content: [] });
    expect(newContentDef("mandatory", "m")).toEqual({ name: "m", content: [] });
    expect(newContentDef("countLimits", "c")).toEqual({ name: "c", playerMin: null, playerMax: null, limits: [] });
  });

  it("generates unique names against existing definitions", () => {
    const root = rootWith(CONTENT_ROOT_FIELD.lists, [{ name: "new_list" }, { name: "new_list-2" }]);
    expect(uniqueContentName(root, "lists", "new_list")).toBe("new_list-3");
    expect(uniqueContentName(root, "lists", "fresh")).toBe("fresh");
  });
});
