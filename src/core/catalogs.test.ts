import { describe, it, expect } from "vitest";
import { catalogs, sidDisplayName, isKnownEnum } from "./catalogs";

describe("catalogs", () => {
  it("exposes the mined layout list", () => {
    expect(catalogs.layouts).toContain("zone_layout_center");
    expect(catalogs.layouts.length).toBeGreaterThanOrEqual(18);
  });

  it("derives a human display name from a SID", () => {
    expect(sidDisplayName("mine_wood")).toBe("Mine Wood");
    expect(sidDisplayName("random_hire_1")).toBe("Random Hire 1");
  });

  it("validates closed enums", () => {
    expect(isKnownEnum("connectionType", "Direct")).toBe(true);
    expect(isKnownEnum("connectionType", "Nope")).toBe(false);
  });
});
