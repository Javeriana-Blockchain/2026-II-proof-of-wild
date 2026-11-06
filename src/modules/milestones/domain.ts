import { stageIndex, type CaseStage } from "../shared/stages";

export type ValidationLevel = "presentado" | "revisado" | "verificado_independiente";

export interface MilestoneRecord {
  id: string;
  caseId: string;
  stage: CaseStage;
  occurredAt: string;
  description: string;
  evidenceHash: string;
  validationLevel: ValidationLevel;
  registeredBy: string;
  validatedBy: string | null;
  anchorTxHash: string | null;
  validationTxHash: string | null;
}

export const VALIDATION_LEVEL_LABELS: Record<ValidationLevel, string> = {
  presentado: "Presentado por el centro",
  revisado: "Revisado por un profesional",
  verificado_independiente: "Verificado de forma independiente",
};

/** Un hito es público solo cuando su hash ya está anclado en la red; antes es un borrador. */
export function isPublicMilestone(milestone: Pick<MilestoneRecord, "anchorTxHash">): boolean {
  return milestone.anchorTxHash !== null;
}

export interface TimelineEntry {
  stage: CaseStage;
  occurredAt: string;
  description: string;
  validationLevel: ValidationLevel;
  validationLabel: string;
  anchorTxHash: string;
  validationTxHash: string | null;
}

/**
 * Línea de tiempo pública (RF-CAT-02): solo hitos anclados, por fecha y, a igual fecha, por orden de etapa.
 * No expone quién registró ni quién validó (datos internos).
 */
export function buildTimeline(milestones: readonly MilestoneRecord[]): TimelineEntry[] {
  return milestones
    .filter(isPublicMilestone)
    .toSorted((a, b) => {
      if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
      return stageIndex(a.stage) - stageIndex(b.stage);
    })
    .map((m) => ({
      stage: m.stage,
      occurredAt: m.occurredAt,
      description: m.description,
      validationLevel: m.validationLevel,
      validationLabel: VALIDATION_LEVEL_LABELS[m.validationLevel],
      anchorTxHash: m.anchorTxHash as string,
      validationTxHash: m.validationTxHash,
    }));
}
