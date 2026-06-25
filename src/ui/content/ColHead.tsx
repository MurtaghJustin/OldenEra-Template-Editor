// A column/section header for the content-drawer table editors, with an optional ⓘ tooltip.
// The marker is aria-hidden so it doesn't affect accessible names.
export function ColHead({ label, hint, span }: { label: string; hint?: string; span?: boolean }) {
  return (
    <div className="ct-head" style={span ? { gridColumn: "1 / -1" } : undefined}>
      {label}
      {hint && <span aria-hidden title={hint} style={{ marginLeft: 3, cursor: "help", opacity: 0.8 }}>ⓘ</span>}
    </div>
  );
}

// A small inline ⓘ tooltip to append after a label that isn't a field component.
export function HintMark({ hint }: { hint: string }) {
  return <span aria-hidden title={hint} style={{ marginLeft: 4, cursor: "help", opacity: 0.65 }}>ⓘ</span>;
}
