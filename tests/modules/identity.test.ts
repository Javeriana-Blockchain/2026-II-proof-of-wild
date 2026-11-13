import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  checkBiometrics,
  IdentityService,
  normalizeDocumentNumber,
  requiredLevel,
  type IdentityRecord,
  type IdentityStore,
  type VerifyIdentityInput,
} from "@/modules/identity";
import { IdentityRejectedError, ValidationError, VerificationRequiredError } from "@/modules/shared/errors";
import { SimulatedIdentityRegistry } from "@/platform/identity/simulated-registry";
import type { IdentityCheckInput, IdentityProvider } from "@/ports/identity-provider";

class MemoryStore implements IdentityStore {
  rows = new Map<string, IdentityRecord & { documentHash: string; consentAt: Date }>();
  async find(userId: string) {
    const row = this.rows.get(userId);
    if (!row) return null;
    const { documentHash: _h, consentAt: _c, ...record } = row;
    return record;
  }
  async findUserByDocument(hash: string) {
    return [...this.rows.values()].find((r) => r.documentHash === hash)?.userId ?? null;
  }
  async save(record: IdentityRecord & { documentHash: string; consentAt: Date }) {
    this.rows.set(record.userId, record);
  }
  async remove(userId: string) {
    this.rows.delete(userId);
  }
}

class FakeProvider implements IdentityProvider {
  readonly name = "Registro de prueba";
  calls: IdentityCheckInput[] = [];
  approve = true;
  async check(input: IdentityCheckInput) {
    this.calls.push(input);
    return this.approve ? { approved: true, reference: "REF-1" } : { approved: false, reference: "REF-2", reason: "No aparece." };
  }
}

const BIOMETRIA = { method: "biometria", faceMatch: 0.82, real: 0.9, live: 0.88, blinked: true, turned: true } as const;
const input = (over: Partial<VerifyIdentityInput> = {}): VerifyIdentityInput => ({
  documentType: "cedula",
  documentNumber: "1.020.304.050",
  consent: true,
  evidence: BIOMETRIA,
  ...over,
});

describe("reglas de verificación de identidad", () => {
  it("pide nivel 2 solo por encima de 50 USDC", () => {
    expect(requiredLevel("10")).toBe(1);
    expect(requiredLevel("50")).toBe(1);
    expect(requiredLevel("50,0000001")).toBe(2);
    expect(requiredLevel("60")).toBe(2);
    expect(requiredLevel("no es un monto")).toBe(1);
  });

  it("normaliza la cédula y el pasaporte y rechaza formatos inválidos", () => {
    expect(normalizeDocumentNumber("cedula", " 1.020.304-050 ")).toBe("1020304050");
    expect(normalizeDocumentNumber("pasaporte", "ab 123456")).toBe("AB123456");
    expect(() => normalizeDocumentNumber("cedula", "12345")).toThrow(ValidationError);
    expect(() => normalizeDocumentNumber("cedula", "12AB5678")).toThrow(ValidationError);
    expect(() => normalizeDocumentNumber("pasaporte", "AB-12")).toThrow(ValidationError);
  });

  it("exige la prueba de vida, un rostro real y que coincida con el documento", () => {
    expect(() => checkBiometrics(BIOMETRIA)).not.toThrow();
    expect(() => checkBiometrics({ ...BIOMETRIA, blinked: false })).toThrow(/prueba de vida/);
    expect(() => checkBiometrics({ ...BIOMETRIA, real: 0.2 })).toThrow(/real/);
    expect(() => checkBiometrics({ ...BIOMETRIA, faceMatch: 0.31 })).toThrow(/no coincide/);
    expect(() => checkBiometrics({ method: "simulada" })).not.toThrow();
  });
});

describe("IdentityService", () => {
  let store: MemoryStore;
  let provider: FakeProvider;
  let service: IdentityService;

  beforeEach(() => {
    store = new MemoryStore();
    provider = new FakeProvider();
    service = new IdentityService(provider, store, {
      hashDocument: (type, number) => createHash("sha256").update(`${type}:${number}`).digest("hex"),
      now: () => new Date("2026-11-12T15:00:00Z"),
    });
  });

  it("verifica y guarda solo el resultado: sin el número completo ni imágenes", async () => {
    const record = await service.verify("u1", input());
    expect(provider.calls).toEqual([{ documentType: "cedula", documentNumber: "1020304050" }]);
    expect(record).toMatchObject({ documentLast4: "4050", method: "biometria", faceMatch: 0.82, providerReference: "REF-1" });
    const saved = store.rows.get("u1")!;
    expect(JSON.stringify(saved)).not.toContain("1020304050");
    expect(await service.levelOf("u1")).toBe(2);
  });

  it("sin autorización de datos sensibles no verifica ni consulta el registro", async () => {
    await expect(service.verify("u1", input({ consent: false }))).rejects.toThrow(/autorización/);
    expect(provider.calls).toHaveLength(0);
  });

  it("un documento no puede verificar dos cuentas", async () => {
    await service.verify("u1", input());
    await expect(service.verify("u2", input())).rejects.toThrow(/ya verificó otra cuenta/);
    await expect(service.verify("u1", input())).resolves.toBeTruthy();
  });

  it("si el registro no confirma el documento, no queda verificado", async () => {
    provider.approve = false;
    await expect(service.verify("u1", input())).rejects.toBeInstanceOf(IdentityRejectedError);
    expect(await service.levelOf("u1")).toBe(1);
  });

  it("la verificación simulada de la demo queda marcada como tal", async () => {
    const record = await service.verify("u1", input({ evidence: { method: "simulada" } }));
    expect(record).toMatchObject({ method: "simulada", faceMatch: null });
  });

  it("los aportes grandes exigen nivel 2 y borrar la verificación vuelve al nivel 1", async () => {
    await expect(service.assertCanContribute("u1", "25")).resolves.toBeUndefined();
    await expect(service.assertCanContribute("u1", "60")).rejects.toBeInstanceOf(VerificationRequiredError);
    await service.verify("u1", input());
    await expect(service.assertCanContribute("u1", "60")).resolves.toBeUndefined();
    await service.remove("u1");
    await expect(service.assertCanContribute("u1", "60")).rejects.toBeInstanceOf(VerificationRequiredError);
  });
});

describe("registro simulado", () => {
  it("aprueba documentos válidos y rechaza los que terminan en 0000", async () => {
    const registry = new SimulatedIdentityRegistry(0);
    await expect(registry.check({ documentType: "cedula", documentNumber: "1020304050" })).resolves.toMatchObject({
      approved: true,
      reference: expect.stringMatching(/^SIM-[0-9A-F]{8}$/),
    });
    const rejected = await registry.check({ documentType: "pasaporte", documentNumber: "AB120000" });
    expect(rejected.approved).toBe(false);
    expect(rejected.reason).toMatch(/registro de pasaportes/);
  });
});
