// Save-time normalization for correctness issues the editor could otherwise leak into a template.

// Remove any `sid` key whose value is an empty string, anywhere in the tree (mutates in place,
// returns the same object for convenience). An empty-string sid is never valid: the map generator
// treats it as a map object with an empty config id, fails to find that config, and crashes
// (`Config with id "" was not found` → NullReferenceException in MapObjectDesc). A content item that
// only pulls from include-lists must OMIT sid entirely (every official template does — 0 use `""`),
// so dropping the empty key makes list-only items match the shipping shape. Applied on save only, so
// it never disturbs in-progress editing (a half-filled row can carry an empty sid transiently).
export function stripEmptySids<T>(value: T): T {
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.sid === "") delete o.sid;
      for (const k of Object.keys(o)) walk(o[k]);
    }
  };
  walk(value);
  return value;
}
