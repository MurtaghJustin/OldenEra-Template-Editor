import type { TemplateRoot } from "./types";

export function cloneRaw<T>(obj: T): T {
  return structuredClone(obj);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Deep-merge `edited` onto a clone of `original`:
// - objects: recurse; keys absent in `edited` are deleted, keys present overwrite/recurse.
// - arrays & primitives: `edited` value replaces `original` value wholesale.
// This keeps any field the editor model still carries (we carry unknowns via index signatures),
// while honoring deletions made in the model.
function mergeValue(orig: unknown, edit: unknown): unknown {
  if (isPlainObject(orig) && isPlainObject(edit)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(edit)) {
      out[k] = k in orig ? mergeValue(orig[k], edit[k]) : edit[k];
    }
    return out;
  }
  return edit; // arrays and primitives replace wholesale
}

export function mergeEdits(original: TemplateRoot, edited: TemplateRoot): TemplateRoot {
  // `edited` is cloned because mergeValue's array/primitive fallback returns the edited
  // value directly; without cloning, the result would alias the caller's arrays/objects.
  // `original` is intentionally NOT cloned: mergeValue only reads from it and never places
  // a reference to it (or its nested values) into the output, so it cannot be mutated.
  return mergeValue(original, cloneRaw(edited)) as TemplateRoot;
}
