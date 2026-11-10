import type { ExpenseCategory, ValidationLevel } from "@/modules/catalog";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  medicamentos: "Medicamentos",
  atencion_veterinaria: "Atención veterinaria",
  alimentacion: "Alimentación",
  rehabilitacion: "Rehabilitación y recintos",
  traslado_liberacion: "Traslado y liberación",
};

/** Niveles de validación: la confianza sube de «presentado» a «verificado de forma independiente». */
export const VALIDATION_LABELS: Record<ValidationLevel, { long: string; short: string }> = {
  presentado: { long: "Presentado por la ONG", short: "Presentado" },
  revisado: { long: "Revisado por un profesional", short: "Revisado" },
  verificado_independiente: { long: "Verificado de forma independiente", short: "Verificado" },
};

export const STAGE_STATUS_LABELS = {
  completada: "Completada",
  en_curso: "En curso",
  pendiente: "Pendiente",
} as const;

/** Activo que muestran las páginas de lectura (no consultan la red ni su configuración). */
export const DISPLAY_ASSET = "USDC";
