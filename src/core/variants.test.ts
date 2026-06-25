import { describe, it, expect } from "vitest";
import { variantsFor, variantLabel } from "./variants";

describe("variant catalog", () => {
  it("names variants for objects with known tables", () => {
    expect(variantsFor("dragon_utopia").length).toBe(4);
    expect(variantsFor("monty_hall").length).toBe(4);
    expect(variantsFor("prison").length).toBe(6);
    expect(variantsFor("research_laboratory").length).toBe(4);
    expect(variantLabel("dragon_utopia", 2)).toBe("Large Guard");
    expect(variantsFor("pandora_box").some((o) => o.value === 45)).toBe(true); // jackpot variant from game data
  });

  it("returns nothing for objects without a variant table", () => {
    expect(variantsFor("the_gorge")).toEqual([]);
    expect(variantsFor(undefined)).toEqual([]);
  });
});
