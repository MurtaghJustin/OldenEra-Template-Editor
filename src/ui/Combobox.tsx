import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A type-to-search combobox with a dropdown we render ourselves — unlike a native <datalist>, this
// lets us size the menu to its content (at least as wide as the input, never truncating an option)
// and position it with `fixed` so the drawer's scroll container can't clip it.
//
// Two modes:
//  • free-text (default): the input text IS the stored value; typing edits it live.
//  • label mode (pass `labelFor`): the field stores a value (e.g. an object SID) but the input
//    shows its human name; typing searches names/values and only an explicit pick changes the value.
export function Combobox({ value, onChange, options, onSelect, labelFor, placeholder, ariaLabel,
  renderOption, renderDetail, valueAdornment }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onSelect?: (v: string) => void; // choosing an option calls this instead of onChange (add-and-clear use)
  labelFor?: (v: string) => string;
  placeholder?: string;
  ariaLabel?: string;
  // Optional rich rendering (used for map-object pickers; other pickers pass none and render plainly):
  renderOption?: (v: string, highlighted: boolean) => ReactNode; // replaces the default row content
  renderDetail?: (v: string) => ReactNode;                       // pinned detail panel for the highlighted row
  valueAdornment?: (v: string) => ReactNode;                     // node shown inside the field, left of the text
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  // Either `top` (menu drops below the input) or `bottom` (menu opens upward, its bottom pinned to
  // the input's top) is set, never both. `maxHeight` is clamped to the room on the chosen side.
  const [rect, setRect] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [typed, setTyped] = useState(false);
  const [query, setQuery] = useState("");

  // Until the user actually types, show the FULL option list (and keep the current selection
  // visible in the input) — so clicking an already-filled field reveals everything that belongs
  // there, not just the current value. Typing then filters.
  const shown = labelFor ? (editing && typed ? query : (value ? labelFor(value) : "")) : value;
  const q = (labelFor ? query : value).toLowerCase();
  const matches = (o: string) => o.toLowerCase().includes(q) || (!!labelFor && labelFor(o).toLowerCase().includes(q));
  const all = typed && q ? options.filter(matches) : options;
  const filtered = all.slice(0, 100);

  const reposition = () => {
    const el = inputRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    // ROW ≈ one option's rendered height; DETAIL reserves room for the pinned detail panel when present.
    const DETAIL = renderDetail ? 132 : 0;
    const MARGIN = 8, MAX = renderDetail ? 380 : 260, ROW = 28;
    const wanted = Math.min(MAX, filtered.length * ROW + (all.length > filtered.length ? ROW : 0) + DETAIL);
    const spaceBelow = window.innerHeight - r.bottom - MARGIN;
    const spaceAbove = r.top - MARGIN;
    // Flip up only when the menu wouldn't fit below AND there's more room above — otherwise keep the
    // natural downward drop. Either way, cap the height to the space on the chosen side so it never
    // runs off-screen (it scrolls instead).
    const flip = spaceBelow < wanted && spaceAbove > spaceBelow;
    const maxHeight = Math.min(MAX, Math.max(0, flip ? spaceAbove : spaceBelow));
    setRect(flip
      ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top, maxHeight }
      : { left: r.left, width: r.width, top: r.bottom, maxHeight });
  };
  useLayoutEffect(() => { if (open) reposition(); }, [open, shown, filtered.length]);
  // While open, keep the fixed menu aligned to the input as the panel scrolls/resizes.
  useLayoutEffect(() => {
    if (!open) return;
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll); };
  }, [open]);

  const choose = (v: string) => { (onSelect ?? onChange)(v); setEditing(false); setTyped(false); setQuery(""); setOpen(false); setHi(-1); };
  // Closing without an explicit pick: free-text value is already live; label mode reverts to the name.
  const close = () => { setEditing(false); setTyped(false); setQuery(""); setOpen(false); setHi(-1); };

  // Icon (or other node) for the currently-stored value, shown inside the field's left edge.
  const adorn = valueAdornment && value ? valueAdornment(value) : null;
  return (
    <div ref={wrap} style={{ position: "relative", width: "100%", minWidth: 0 }}>
      {adorn && (
        <span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", pointerEvents: "none", zIndex: 1 }}>{adorn}</span>
      )}
      <input ref={inputRef} aria-label={ariaLabel} placeholder={placeholder} value={shown}
        style={{ width: "100%", ...(adorn ? { paddingLeft: 26 } : null) }}
        onFocus={() => { setEditing(true); setTyped(false); setQuery(""); setOpen(true); }}
        onChange={(e) => { if (labelFor) setQuery(e.target.value); else onChange(e.target.value); setTyped(true); setOpen(true); setHi(-1); }}
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
      {open && rect && filtered.length > 0 && createPortal(
        // Portalled to <body> so it escapes the inspector/drawer stacking context and never gets
        // overlapped by panel content scrolling beneath it.
        <div role="listbox" style={{
          position: "fixed", left: rect.left, minWidth: rect.width, width: "max-content",
          ...(rect.top !== undefined ? { top: rect.top } : { bottom: rect.bottom }),
          maxWidth: "min(560px, 92vw)", maxHeight: rect.maxHeight, zIndex: 1000,
          display: "flex", flexDirection: "column",
          background: "#1f1f1f", border: "1px solid #3a3a3a", borderRadius: 6, boxShadow: "0 6px 18px rgba(0,0,0,0.55)",
        }}>
          {/* Scrolling option list. When renderDetail is set, the detail panel below stays pinned. */}
          <div style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
            {filtered.map((o, i) => (
              <div key={o} role="option" aria-selected={i === hi}
                onMouseDown={(e) => { e.preventDefault(); choose(o); }} onMouseEnter={() => setHi(i)}
                style={{ padding: "5px 10px", cursor: "pointer", fontSize: 12, wordBreak: "break-word",
                  background: i === hi ? "#2b3a1d" : "transparent", color: i === hi ? "#cfe8a0" : "#ddd" }}>
                {renderOption ? renderOption(o, i === hi)
                  : labelFor ? <>{labelFor(o)} <span style={{ opacity: 0.4, fontSize: 11 }}>{o}</span></> : o}
              </div>
            ))}
            {all.length > filtered.length && (
              <div style={{ padding: "5px 10px", fontSize: 11, opacity: 0.5 }}>+{all.length - filtered.length} more — keep typing…</div>
            )}
          </div>
          {renderDetail && (
            <div style={{ flex: "0 0 auto", borderTop: "1px solid #3a3a3a", background: "#191919" }}>
              {renderDetail(hi >= 0 ? filtered[hi] : filtered[0])}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
