import "@testing-library/jest-dom/vitest";

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
// Stub them globally so vi.spyOn can intercept them in file I/O tests.
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:stub";
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}
