import { describe, it, expect } from "vitest";
import { stripEmptySids } from "./normalize";

describe("stripEmptySids", () => {
  it("removes empty-string sid keys but keeps real sids and the rest of the object", () => {
    const root = {
      mandatoryContent: [{ name: "mg", content: [
        { sid: "mine_gold", isGuarded: true },
        { sid: "", includeLists: ["banks"], isGuarded: false },   // list-only item: sid must be dropped
      ] }],
      contentPools: [{ name: "p", groups: [{ content: [{ sid: "", weight: 100 }, { sid: "bank", weight: 50 }] }] }],
    };
    stripEmptySids(root);
    const items = root.mandatoryContent[0].content;
    expect(items[0]).toEqual({ sid: "mine_gold", isGuarded: true });
    expect("sid" in items[1]).toBe(false);                        // empty sid removed
    expect(items[1]).toEqual({ includeLists: ["banks"], isGuarded: false });
    const poolContent = root.contentPools[0].groups[0].content as Record<string, unknown>[];
    expect("sid" in poolContent[0]).toBe(false);
    expect(poolContent[1].sid).toBe("bank");
  });

  it("leaves a document with no empty sids unchanged and returns the same reference", () => {
    const root = { mandatoryContent: [{ content: [{ sid: "x" }] }] };
    const before = JSON.stringify(root);
    const ret = stripEmptySids(root);
    expect(ret).toBe(root);
    expect(JSON.stringify(root)).toBe(before);
  });
});
