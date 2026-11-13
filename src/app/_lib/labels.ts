import type { Traductor } from "@/i18n/traductor";
import type { CaseOutcome, ExpenseCategory, ValidationLevel } from "@/modules/catalog";

/** Categorías de gasto, en el orden en que se muestran y se eligen. */
export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "medicamentos",
  "atencion_veterinaria",
  "alimentacion",
  "rehabilitacion",
  "traslado_liberacion",
];

/** «Medicamentos», «Atención veterinaria»… en el idioma del traductor. */
export function categoryLabel(t: Traductor["t"], category: ExpenseCategory): string {
  return t(`comun.categoria.${category}`);
}

/**
 * Niveles de validación: la confianza sube de «presentado» a «verificado de forma independiente».
 * `long` para chips y textos; `short` para tablas.
 */
export function validationLabel(t: Traductor["t"], level: ValidationLevel): { long: string; short: string } {
  return { long: t(`comun.validacion.${level}.long`), short: t(`comun.validacion.${level}.short`) };
}

/** «Completada», «En curso», «Pendiente». */
export function stageStatusLabel(t: Traductor["t"], status: "completada" | "en_curso" | "pendiente"): string {
  return t(`comun.etapa.${status}`);
}

/**
 * Resultado de un caso recuperado. En español se muestra tal como lo escribió la ONG («Liberada», «En reserva»); en
 * los otros idiomas, la traducción del tipo de resultado, porque ese texto viene de la base y está en español.
 */
export function outcomeLabel(
  tr: Pick<Traductor, "t" | "idioma">,
  outcome: CaseOutcome | null,
  label: string | null,
): string {
  if (tr.idioma === "es" && label) return label;
  return outcome ? tr.t(`comun.desenlace.${outcome}`) : (label ?? "");
}

/** Texto del chip de un caso: la etapa en curso (como la escribió la ONG) o, si ya se recuperó, su resultado. */
export function chipLabel(
  tr: Pick<Traductor, "t" | "idioma">,
  item: { recovered: boolean; outcome: CaseOutcome | null; outcomeLabel: string | null; chip: { label: string } },
): string {
  return item.recovered && item.outcome ? outcomeLabel(tr, item.outcome, item.outcomeLabel) : item.chip.label;
}

/** Activo que muestran las páginas de lectura (no consultan la red ni su configuración). */
export const DISPLAY_ASSET = "USDC";
