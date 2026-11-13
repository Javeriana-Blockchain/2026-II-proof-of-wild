import { describe, expect, it } from "vitest";
import { fromStroops, normalizePositiveAmount, sumAmounts, toStroops } from "@/lib/amount";

describe("montos en stroops", () => {
  it("convierte decimales exactos sin errores de punto flotante", () => {
    expect(toStroops("25.5")).toBe(255_000_000n);
    expect(toStroops("0.0000001")).toBe(1n);
    expect(toStroops("0.1") + toStroops("0.2")).toBe(toStroops("0.3"));
  });

  it("rechaza formatos inválidos", () => {
    for (const bad of ["", "abc", "-1", "1.00000001", "1,5", ".5", "1."]) {
      expect(() => toStroops(bad)).toThrow(RangeError);
    }
  });

  it("formatea con 7 decimales", () => {
    expect(fromStroops(255_000_000n)).toBe("25.5000000");
    expect(fromStroops(0n)).toBe("0.0000000");
  });

  it("normaliza solo montos positivos", () => {
    expect(normalizePositiveAmount("10")).toBe("10.0000000");
    expect(() => normalizePositiveAmount("0")).toThrow(RangeError);
  });

  it("suma montos con exactitud", () => {
    expect(sumAmounts(["0.1", "0.2", "10"])).toBe("10.3000000");
    expect(sumAmounts([])).toBe("0.0000000");
  });
});
