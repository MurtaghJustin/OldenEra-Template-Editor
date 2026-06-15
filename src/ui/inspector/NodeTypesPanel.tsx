import { useEditorStore } from "../../state/store";

export function NodeTypesPanel() {
  const nodeTypes = useEditorStore((s) => s.nodeTypes);
  return (
    <div>
      <h3>Node Types</h3>
      <ul>
        {nodeTypes.map((t) => (
          <li key={t.id}>
            <strong>{t.label}</strong> <span style={{ opacity: 0.6 }}>({t.id})</span>
            {t.builtin ? <em style={{ opacity: 0.5 }}> built-in</em> : null}
            <div style={{ fontSize: 12, opacity: 0.7 }}>layout: {t.zone.layout as string}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
