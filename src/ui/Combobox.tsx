import { useLayoutEffect, useRef, useState } from "react";

// A type-to-search combobox with a dropdown we render ourselves — unlike a native <datalist>, this
// lets us size the menu to its content (at least as wide as the input, never truncating an option)
// and position it with `fixed` so the drawer's scroll container can't clip it.
//
// Two modes:
//  • free-text (default): the input text IS the stored value; typing edits it live.
//  • label mode (pass `labelFor`): the field stores a value (e.g. an object SID) but the input
//    shows its human name; typing searches names/values and only an explicit pick changes the value.
export function Combobox({ value, onChange, options, onSelect, labelFor, placeholder, ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onSelect?: (v: string) => void; // choosing an option calls this instead of onChange (add-and-clear use)
  labelFor?: (v: string) => string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");

  // In label mode the input shows the search query while focused, otherwise the value's name.
  const shown = labelFor ? (editing ? query : (value ? labelFor(value) : "")) : value;
  const q = (labelFor ? query : value).toLowerCase();
  const matches = (o: string) => o.toLowerCase().includes(q) || (!!labelFor && labelFor(o).toLowerCase().includes(q));
  const all = q ? options.filter(matches) : options;
  const filtered = all.slice(0, 100);

  const reposition = () => {
    const el = inputRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom, width: r.width });
  };
  useLayoutEffect(() => { if (open) reposition(); }, [open, shown]);
  // While open, keep the fixed menu aligned to the input as the panel scrolls/resizes.
  useLayoutEffect(() => {
    if (!open) return;
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll); };
  }, [open]);

  const choose = (v: string) => { (onSelect ?? onChange)(v); setEditing(false); setQuery(""); setOpen(false); setHi(-1); };
  // Closing without an explicit pick: free-text value is already live; label mode reverts to the name.
  const close = () => { setEditing(false); setQuery(""); setOpen(false); setHi(-1); };

  return (
    <div ref={wrap} style={{ position: "relative", width: "100%", minWidth: 0 }}>
      <input ref={inputRef} aria-label={ariaLabel} placeholder={placeholder} value={shown} style={{ width: "100%" }}
        onFocus={() => { setEditing(true); setQuery(""); setOpen(true); }}
        onChange={(e) => { if (labelFor) setQuery(e.target.value); else onChange(e.target.value); setOpen(true); setHi(-1); }}
        onBlur={close}
        onKeyDown={(e) => {
          if (e.key === "Escape") { close(); inputRef.current?.blur(); }
          else if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") {
            if (open && hi >= 0 && filtered[hi]) { e.preventDefault(); choose(filtered[hi]); }
            else if (open && filtered.length === 1) { e.preventDefault(); choose(filtered[0]); }
          }
        }} />
      {open && rect && filtered.length > 0 && (
        <div role="listbox" style={{
          position: "fixed", left: rect.left, top: rect.top, minWidth: rect.width, width: "max-content",
          maxWidth: "min(560px, 92vw)", maxHeight: 260, overflowY: "auto", zIndex: 60,
          background: "#1f1f1f", border: "1px solid #3a3a3a", borderRadius: 6, boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
        }}>
          {filtered.map((o, i) => (
            <div key={o} role="option" aria-selected={i === hi}
              onMouseDown={(e) => { e.preventDefault(); choose(o); }} onMouseEnter={() => setHi(i)}
              style={{ padding: "5px 10px", cursor: "pointer", fontSize: 12, wordBreak: "break-word",
                background: i === hi ? "#2b3a1d" : "transparent", color: i === hi ? "#cfe8a0" : "#ddd" }}>
              {labelFor ? <>{labelFor(o)} <span style={{ opacity: 0.4, fontSize: 11 }}>{o}</span></> : o}
            </div>
          ))}
          {all.length > filtered.length && (
            <div style={{ padding: "5px 10px", fontSize: 11, opacity: 0.5 }}>+{all.length - filtered.length} more — keep typing…</div>
          )}
        </div>
      )}
    </div>
  );
}
