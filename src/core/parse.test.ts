import { describe, it, expect } from "vitest";
import { parseTemplate, serializeTemplate } from "./parse";
import minimal from "../test-fixtures/minimal.rmg.json";

describe("parse", () => {
  it("parses JSON text into a typed root", () => {
    const r = parseTemplate(JSON.stringify(minimal));
    expect(r.name).toBe("Minimal");
    expect(r.variants[0].zones).toHaveLength(3);
  });

  it("throws a friendly error on invalid JSON", () => {
    expect(() => parseTemplate("{ not json")).toThrow(/Invalid JSON/);
  });

  it("serializes with tab indentation and trailing newline", () => {
    const r = parseTemplate(JSON.stringify(minimal));
    const text = serializeTemplate(r);
    expect(text.startsWith("{\n\t")).toBe(true);
    expect(text.endsWith("\n")).toBe(true);
  });
});
