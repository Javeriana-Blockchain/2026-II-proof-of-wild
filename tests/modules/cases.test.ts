import { describe, expect, it } from "vitest";
import {
  fundingProgress,
  isValidCaseCode,
  presentFinalDestination,
  toPublicCase,
  type CaseRecord,
} from "@/modules/cases";

const record: CaseRecord = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "POW-001",
  centerId: "22222222-2222-2222-2222-222222222222",
  species: "Oso de anteojos",
  speciesPublic: false,
  intakeDate: "2026-10-01",
  initialState: "Deshidratación severa; informe veterinario completo en archivo privado.",
  goalAmount: "1000",
  currentStage: "rehabilitacion",
  finalDestination: null,
};

describe("progreso de financiación", () => {
  it("calcula el porcentaje con un decimal y lo limita a 100", () => {
    expect(fundingProgress("1000", "250")).toBe(25);
    expect(fundingProgress("3", "1")).toBe(33.3);
    expect(fundingProgress("100", "150")).toBe(100);
    expect(fundingProgress("100", "0")).toBe(0);
  });
});

describe("código de caso", () => {
  it("acepta POW-nnn y rechaza lo demás", () => {
    expect(isValidCaseCode("POW-001")).toBe(true);
    expect(isValidCaseCode("POW-1")).toBe(false);
    expect(isValidCaseCode("oso-001")).toBe(false);
  });
});

describe("proyección pública del caso (QA-SEG-01)", () => {
  it("expone únicamente los campos públicos", () => {
    const pub = toPublicCase(record, "250", "Centro de Fauna Ficticio");
    expect(Object.keys(pub).sort()).toEqual(
      [
        "centerName",
        "code",
        "finalDestination",
        "goalAmount",
        "intakeDate",
        "progressPercent",
        "raisedAmount",
        "species",
        "stage",
      ].sort(),
    );
    // Nada del modelo interno se filtra, ni siquiera por accidente.
    const serialized = JSON.stringify(pub);
    expect(serialized).not.toContain(record.id);
    expect(serialized).not.toContain(record.centerId);
    expect(serialized).not.toContain("informe veterinario");
  });

  it("oculta la especie cuando no es seguro divulgarla (RN-05)", () => {
    expect(toPublicCase(record, "0", "Centro").species).toBeNull();
    expect(toPublicCase({ ...record, speciesPublic: true }, "0", "Centro").species).toBe("Oso de anteojos");
  });

  it("normaliza los montos a 7 decimales", () => {
    const pub = toPublicCase(record, "250", "Centro");
    expect(pub.goalAmount).toBe("1000.0000000");
    expect(pub.raisedAmount).toBe("250.0000000");
    expect(pub.progressPercent).toBe(25);
  });
});

describe("destino final (RN-09)", () => {
  it("trata la reubicación y el santuario como destinos legítimos", () => {
    for (const destination of ["liberacion", "reubicacion", "santuario"] as const) {
      expect(presentFinalDestination(destination).legitimate).toBe(true);
    }
    expect(presentFinalDestination("fallecimiento").legitimate).toBe(false);
  });
});
