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

  it("serialize -> parse preserves all content (lossless)", () => {
    const r = parseTemplate(JSON.stringify(minimal));
    const round = parseTemplate(serializeTemplate(r));
    expect(round).toEqual(r);
  });

  it("preserves unknown/extra fields through serialize", () => {
    const text = JSON.stringify({ ...minimal, futureUnknownField: { keep: 42 } });
    const out = JSON.parse(serializeTemplate(parseTemplate(text)));
    expect(out.futureUnknownField).toEqual({ keep: 42 });
  });

  it("throws on valid JSON that is not an object", () => {
    expect(() => parseTemplate("null")).toThrow(/must be a JSON object/);
    expect(() => parseTemplate("[]")).toThrow(/must be a JSON object/);
  });
});
