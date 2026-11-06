import { describe, expect, it } from "vitest";
import { assertCaseCodeMemo, assertEvidenceHash, base64ToHex, MEMO_TEXT_MAX_BYTES } from "@/platform/stellar/memo";

describe("memo de texto con el código del caso", () => {
  it("acepta códigos con el formato POW-nnn y que caben en 28 bytes", () => {
    expect(assertCaseCodeMemo("POW-001")).toBe("POW-001");
    expect(new TextEncoder().encode("POW-123456").length).toBeLessThanOrEqual(MEMO_TEXT_MAX_BYTES);
    expect(assertCaseCodeMemo("POW-123456")).toBe("POW-123456");
  });

  it("rechaza formatos inválidos", () => {
    for (const bad of ["POW-1", "pow-001", "POW-0001234", "XX-001", "POW-001 ", ""]) {
      expect(() => assertCaseCodeMemo(bad)).toThrow(RangeError);
    }
  });
});

describe("hash de evidencia", () => {
  it("acepta SHA-256 hexadecimal en minúscula y rechaza lo demás", () => {
    expect(assertEvidenceHash("ab".repeat(32))).toBe("ab".repeat(32));
    expect(() => assertEvidenceHash("zz".repeat(32))).toThrow(RangeError);
    expect(() => assertEvidenceHash("ab")).toThrow(RangeError);
  });

  it("convierte el memo hash de Horizon (base64) a hexadecimal", () => {
    const hex = "0123456789abcdef".repeat(4);
    expect(base64ToHex(Buffer.from(hex, "hex").toString("base64"))).toBe(hex);
  });
});
