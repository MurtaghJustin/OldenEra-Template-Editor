import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A type-to-search combobox with a dropdown we render ourselves — unlike a native <datalist>, this
// lets us size the menu to its content (at least as wide as the input, never truncating an option)
// and position it with `fixed` so the drawer's scroll container can't clip it.
export function Combobox({ value, onChange, options, onSelect, placeholder, ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onSelect?: (v: string) => void; // when given, choosing an option calls this instead of onChange (add-and-clear use)
  placeholder?: string;
  ariaLabel?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);

  const q = value.toLowerCase();
  const all = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  const filtered = all.slice(0, 100);

  const reposition = () => {
    const el = inputRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom, width: r.width });
  };
  useLayoutEffect(() => { if (open) reposition(); }, [open, value]);
  useEffect(() => {
    if (!open) return;
    const onScroll = () => reposition();
    const onDocDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("mousedown", onDocDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [open]);

  const choose = (v: string) => { (onSelect ?? onChange)(v); setOpen(false); setHi(-1); };

  return (
    <div ref={wrap} style={{ position: "relative", width: "100%", minWidth: 0 }}>
      <input ref={inputRef} aria-label={ariaLabel} placeholder={placeholder} value={value} style={{ width: "100%" }}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && open && hi >= 0 && filtered[hi]) { e.preventDefault(); choose(filtered[hi]); }
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
              {o}
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
