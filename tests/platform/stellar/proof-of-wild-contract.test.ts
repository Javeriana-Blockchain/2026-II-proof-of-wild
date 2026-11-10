import { contract } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { unwrapResult } from "@/platform/stellar/proof-of-wild-contract";

describe("resultado de una función del contrato", () => {
  it("desenvuelve el Ok de las funciones que devuelven Result (por ejemplo, el reparto de aportar)", () => {
    expect(unwrapResult<bigint[]>(new contract.Ok([400000000n, 100000000n]))).toEqual([400000000n, 100000000n]);
  });

  it("lanza el error del contrato cuando la función devolvió Err", () => {
    expect(() => unwrapResult(new contract.Err({ message: "SuperaLaMeta" }))).toThrow();
  });

  it("deja igual un valor que no viene envuelto", () => {
    expect(unwrapResult(7)).toBe(7);
    expect(unwrapResult(null)).toBeNull();
  });
});
