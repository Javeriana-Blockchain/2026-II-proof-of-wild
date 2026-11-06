import { describe, expect, it } from "vitest";
import { buildTimeline, isPublicMilestone, type MilestoneRecord } from "@/modules/milestones";

const HASH = "a".repeat(64);

function milestone(overrides: Partial<MilestoneRecord>): MilestoneRecord {
  return {
    id: "m-1",
    caseId: "case-1",
    stage: "ingreso",
    occurredAt: "2026-10-01",
    description: "Ingreso al centro",
    evidenceHash: HASH,
    validationLevel: "presentado",
    registeredBy: "user-center",
    validatedBy: null,
    anchorTxHash: "b".repeat(64),
    validationTxHash: null,
    ...overrides,
  };
}

describe("línea de tiempo", () => {
  it("excluye los borradores sin ancla en la red", () => {
    const draft = milestone({ id: "draft", anchorTxHash: null });
    expect(isPublicMilestone(draft)).toBe(false);
    expect(buildTimeline([draft, milestone({ id: "ok" })])).toHaveLength(1);
  });

  it("ordena por fecha y, a igual fecha, por orden de etapa", () => {
    const timeline = buildTimeline([
      milestone({ stage: "rehabilitacion", occurredAt: "2026-10-20" }),
      milestone({ stage: "evaluacion_veterinaria", occurredAt: "2026-10-05" }),
      milestone({ stage: "cuarentena", occurredAt: "2026-10-05" }),
      milestone({ stage: "ingreso", occurredAt: "2026-10-01" }),
    ]);
    expect(timeline.map((entry) => entry.stage)).toEqual([
      "ingreso",
      "cuarentena",
      "evaluacion_veterinaria",
      "rehabilitacion",
    ]);
  });

  it("muestra el nivel de validación y no expone quién registró o validó", () => {
    const [entry] = buildTimeline([
      milestone({
        validationLevel: "revisado",
        validatedBy: "user-validator",
        validationTxHash: "c".repeat(64),
      }),
    ]);
    expect(entry?.validationLabel).toBe("Revisado por un profesional");
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain("user-center");
    expect(serialized).not.toContain("user-validator");
    expect(entry?.validationTxHash).toBe("c".repeat(64));
  });
});
