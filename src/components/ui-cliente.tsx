"use client";

import type { ReactNode } from "react";
import { validationLabel } from "@/app/_lib/labels";
import { useT } from "@/i18n/cliente";
import type { ValidationLevel } from "@/modules/catalog";
import { Chip, type ChipTone } from "./chip";

/*
 * Piezas de interfaz con texto propio. Son de cliente para que tomen el idioma del contexto tanto si las pinta una
 * página de servidor como un diálogo; se importan desde `@/components/ui`.
 */

/** Chip de validación: sube de intensidad a medida que sube la confianza. */
export function ValidationChip({ level, short = false }: { level: ValidationLevel; short?: boolean }) {
  const { t } = useT();
  const tone: ChipTone = level === "verificado_independiente" ? "logro" : level === "revisado" ? "salvia" : "borde";
  const label = validationLabel(t, level);
  return <Chip tone={tone}>{short ? label.short : label.long}</Chip>;
}

/** Barra de lo cubierto: una regla de mapa con el tramo recorrido en bosque. */
export function ProgressBar({
  percent,
  label,
  className = "",
  tone = "claro",
}: {
  percent: number;
  /** Nombre accesible; por defecto «Porcentaje recaudado». */
  label?: string;
  className?: string;
  /** «oscuro» sobre fondos profundo o bosque. */
  tone?: "claro" | "oscuro";
}) {
  const { t } = useT();
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label ?? t("comun.ui.porcentajeRecaudado")}
      className={`relative h-2.5 w-full overflow-hidden rounded-full ${tone === "oscuro" ? "bg-white/20" : "bg-arena/45"} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-(--ease-out-expo) ${tone === "oscuro" ? "bg-arena" : "bg-bosque"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

/** Enlace a la transacción en Stellar Expert. Abre en otra pestaña. */
export function ExplorerLink({ href, children = "Stellar Expert" }: { href: string; children?: ReactNode }) {
  const { t } = useT();
  return (
    <a href={href} target="_blank" rel="noreferrer" className="enlace inline-flex items-center gap-1">
      {children}
      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">{t("comun.ui.abreOtraPestana")}</span>
    </a>
  );
}

export function TestnetBadge({ dark = false }: { dark?: boolean }) {
  const { t } = useT();
  return (
    <span
      className={`rotulo inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 leading-none ${dark ? "border-white/40 text-white" : "border-arena bg-white/60 text-secundario"}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 animate-brillo rounded-full ${dark ? "bg-salvia" : "bg-bosque"}`} />
      {t("comun.demoTestnet")}
    </span>
  );
}
