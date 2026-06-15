export function supportsFsAccess(): boolean {
  return typeof (window as any).showOpenFilePicker === "function";
}

export async function openFileText(): Promise<{ text: string; name: string } | null> {
  if (supportsFsAccess()) {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{ description: "RMG Template", accept: { "application/json": [".json"] } }],
    });
    const file = await handle.getFile();
    return { text: await file.text(), name: file.name };
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.rmg.json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ text: await file.text(), name: file.name });
    };
    input.click();
  });
}

export function downloadTextFallback(text: string, name: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export async function saveText(text: string, name: string): Promise<void> {
  if (supportsFsAccess() && typeof (window as any).showSaveFilePicker === "function") {
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: name });
      const w = await handle.createWritable();
      await w.write(text); await w.close();
      return;
    } catch { /* fall through to download */ }
  }
  downloadTextFallback(text, name);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}

export async function exportPng(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await canvasToPngBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
