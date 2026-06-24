import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../state/store";
import {
  contentDefs, newContentDef, uniqueContentName, CONTENT_KIND_LABEL,
  type ContentKind, type ContentDef,
} from "../../core/content";
import { TextField } from "../inspector/fields";
import { CountLimitsEditor } from "./CountLimitsEditor";
import { ListEditor } from "./ListEditor";
import { PoolEditor } from "./PoolEditor";
import { MandatoryEditor } from "./MandatoryEditor";
import "./drawer.css";

// A navigation entry in the drawer's back-stack. Edits operate on a DRAFT copy that is only
// committed to the store on Accept, so cancelling (or backing out) discards an in-progress edit and
// never leaves a half-built definition in the template.
type Entry =
  | { mode: "browse"; kind: ContentKind }
  | { mode: "edit"; kind: ContentKind; originalName: string; draft: ContentDef }
  | { mode: "new"; kind: ContentKind; draft: ContentDef };

export function ContentDrawer() {
  const target = useEditorStore((s) => s.contentDrawer);
  const [stack, setStack] = useState<Entry[]>([]);
  const stackLen = useRef(stack.length); stackLen.current = stack.length;

  // Esc dismisses: back out one level if drilled in, otherwise close the drawer.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (stackLen.current <= 1) useEditorStore.getState().closeContentDrawer();
      else setStack((s) => s.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target]);

  // (Re)initialise the stack whenever the store opens the drawer to a new target. Drilling into a
  // referenced definition pushes onto `stack` locally and doesn't touch the store, so it survives.
  useEffect(() => {
    if (!target) { setStack([]); return; }
    const root = useEditorStore.getState().root;
    const { kind, itemName, createNew } = target;
    if (createNew) {
      const name = uniqueContentName(root, kind, `new_${kind}`);
      setStack([{ mode: "new", kind, draft: newContentDef(kind, name) }]);
      return;
    }
    const def = itemName ? contentDefs(root, kind).find((d) => d.name === itemName) : undefined;
    setStack([def
      ? { mode: "edit", kind, originalName: def.name, draft: structuredClone(def) }
      : { mode: "browse", kind }]);
  }, [target]);

  if (!target || stack.length === 0) return null;
  const top = stack[stack.length - 1];
  const close = () => useEditorStore.getState().closeContentDrawer();
  const pop = () => { if (stack.length <= 1) close(); else setStack((s) => s.slice(0, -1)); };
  const pushEdit = (kind: ContentKind, name: string) => {
    const def = contentDefs(useEditorStore.getState().root, kind).find((d) => d.name === name);
    if (def) setStack((s) => [...s, { mode: "edit", kind, originalName: def.name, draft: structuredClone(def) }]);
  };
  const pushNew = (kind: ContentKind) => {
    const name = uniqueContentName(useEditorStore.getState().root, kind, `new_${kind}`);
    setStack((s) => [...s, { mode: "new", kind, draft: newContentDef(kind, name) }]);
  };
  const setTopDraft = (d: ContentDef) => setStack((s) => s.map((e, i) => (i === s.length - 1 ? { ...e, draft: d } : e)));
  const accept = () => {
    if (top.mode === "edit") useEditorStore.getState().upsertContentDef(top.kind, top.draft, top.originalName);
    else if (top.mode === "new") {
      useEditorStore.getState().upsertContentDef(top.kind, top.draft);
      target.referenceBack?.(top.draft.name); // e.g. add the new def to the zone that launched "+ New"
    }
    pop();
  };

  const title = top.mode === "browse" ? CONTENT_KIND_LABEL[top.kind]
    : top.mode === "edit" ? `Edit: ${top.originalName}`
    : `New — ${CONTENT_KIND_LABEL[top.kind]}`;

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <div className="drawer-panel">
        <div className="drawer-header">
          {stack.length > 1 && <button onClick={pop} title="Back" aria-label="Back">←</button>}
          <span style={{ fontWeight: "bold", flex: 1 }}>{title}</span>
          <button onClick={close} title="Close" aria-label="Close drawer">✕</button>
        </div>
        <div className="drawer-body">
          {top.mode === "browse"
            ? <BrowseList kind={top.kind} onOpen={(n) => pushEdit(top.kind, n)} onNew={() => pushNew(top.kind)} />
            : <EditorBody kind={top.kind} draft={top.draft} onChange={setTopDraft} onOpenRef={pushEdit} />}
        </div>
        {top.mode !== "browse" && (
          <div className="drawer-footer">
            <button onClick={pop}>Cancel</button>
            <button onClick={accept} style={{ fontWeight: "bold" }}>Accept</button>
          </div>
        )}
      </div>
    </>
  );
}

function BrowseList({ kind, onOpen, onNew }: { kind: ContentKind; onOpen: (name: string) => void; onNew: () => void }) {
  const root = useEditorStore((s) => s.root);
  const remove = useEditorStore((s) => s.removeContentDef);
  const defs = contentDefs(root, kind);
  return (
    <div>
      <button onClick={onNew} style={{ marginBottom: 8 }}>+ New</button>
      {defs.length === 0 && <div style={{ opacity: 0.6, fontSize: 12 }}>No definitions yet.</div>}
      {defs.map((d) => (
        <div className="content-browse-row" key={d.name}>
          <button style={{ flex: 1, textAlign: "left" }} onClick={() => onOpen(d.name)}>{d.name}</button>
          <button title={`Delete ${d.name}`} aria-label={`Delete ${d.name}`} style={{ color: "#e88" }}
            onClick={() => remove(kind, d.name)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function EditorBody({ kind, draft, onChange, onOpenRef }:
  { kind: ContentKind; draft: ContentDef; onChange: (d: ContentDef) => void; onOpenRef: (k: ContentKind, name: string) => void }) {
  return (
    <div>
      <TextField label="Name" value={draft.name} onChange={(name) => onChange({ ...draft, name })} />
      {kind === "countLimits" && <CountLimitsEditor draft={draft} onChange={onChange} />}
      {kind === "lists" && <ListEditor draft={draft} onChange={onChange} />}
      {kind === "pools" && <PoolEditor draft={draft} onChange={onChange} onOpenRef={onOpenRef} />}
      {kind === "mandatory" && <MandatoryEditor draft={draft} onChange={onChange} onOpenRef={onOpenRef} />}
    </div>
  );
}
