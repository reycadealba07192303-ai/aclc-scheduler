import type { Model } from "mongoose";
import { describe, expect, it } from "vitest";
import * as models from "@/backend/models";

// Regression: AttendanceSession once declared two indexes that both got the
// automatic name "scheduleId_1", so MongoDB silently kept only one and the
// "one open session per class" rule was never enforced.
describe("declared MongoDB indexes", () => {
  const entries = Object.entries(models).filter(([, value]) => typeof value === "function" && "schema" in (value as object)) as [string, Model<unknown>][];

  it("covers every model", () => {
    expect(entries.length).toBeGreaterThan(15);
  });

  it.each(entries.map(([name, model]) => [name, model]))("%s has no two indexes with the same name", (_name, model) => {
    const names = (model as Model<unknown>).schema.indexes().map(([fields, options]) =>
      (options as { name?: string }).name ?? Object.entries(fields).map(([field, order]) => `${field}_${order}`).join("_"));
    expect(new Set(names).size, names.join(", ")).toBe(names.length);
  });
});
