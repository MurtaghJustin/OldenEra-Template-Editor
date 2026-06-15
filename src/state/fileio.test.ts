import { describe, it, expect, vi } from "vitest";
import { downloadTextFallback, supportsFsAccess, canvasToPngBlob } from "./fileio";

describe("fileio", () => {
  it("detects File System Access support from the window", () => {
    expect(typeof supportsFsAccess()).toBe("boolean");
  });

  it("downloadTextFallback creates and clicks an anchor", () => {
    const click = vi.fn();
    const anchor: any = { click, set href(_v: string) {}, set download(_v: string) {} };
    vi.spyOn(document, "createElement").mockReturnValueOnce(anchor as HTMLAnchorElement);
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    downloadTextFallback("hello", "a.txt");
    expect(click).toHaveBeenCalled();
    expect(createUrl).toHaveBeenCalled();
  });

  it("canvasToPngBlob resolves with a Blob", async () => {
    const fakeBlob = new Blob(["x"], { type: "image/png" });
    const canvas: any = { toBlob: (cb: (b: Blob | null) => void) => cb(fakeBlob) };
    const blob = await canvasToPngBlob(canvas);
    expect(blob).toBe(fakeBlob);
  });
});
