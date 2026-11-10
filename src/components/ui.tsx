import type { ReactNode } from "react";
import { VALIDATION_LABELS } from "@/app/_lib/labels";
import type { ValidationLevel } from "@/modules/catalog";

/** Estilos de botón del diseño (página 22): principal, secundario con borde, arena y desactivado. */
const BUTTONS = {
  primario: "bg-bosque text-white hover:bg-profundo",
  secundario: "border border-bosque bg-white text-bosque hover:bg-crema",
  arena: "bg-arena text-texto hover:brightness-95",
  contorno: "border border-white/70 text-white hover:bg-white/10",
} as const;

export function buttonClass(variant: keyof typeof BUTTONS = "primario", extra = ""): string {
  return `inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:border-arena disabled:bg-gris disabled:text-secundario ${BUTTONS[variant]} ${extra}`;
}

const CHIP_TONES = {
  /** Etapa: arena con texto oscuro. */
  etapa: "bg-arena text-texto",
  /** Logro (liberado, completada, verificado): verde bosque con texto blanco. */
  logro: "bg-bosque text-white",
  /** Salvia: «revisado por un profesional», «tu aporte». */
  salvia: "bg-salvia text-texto",
  /** Blanco con borde arena: «presentado por la ONG», «pendiente». */
  borde: "border border-arena bg-white text-texto",
  /** Sobre fondos oscuros. */
  oscuro: "bg-white/15 text-white",
} as const;

export type ChipTone = keyof typeof CHIP_TONES;

export function Chip({ tone = "etapa", children, className = "" }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold ${CHIP_TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Chip de validación: sube de intensidad a medida que sube la confianza. */
export function ValidationChip({ level, short = false }: { level: ValidationLevel; short?: boolean }) {
  const tone: ChipTone = level === "verificado_independiente" ? "logro" : level === "revisado" ? "salvia" : "borde";
  const label = VALIDATION_LABELS[level];
  return <Chip tone={tone}>{short ? label.short : label.long}</Chip>;
}

export function ProgressBar({ percent, label = "Porcentaje recaudado", className = "" }: { percent: number; label?: string; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className={`h-2 w-full overflow-hidden rounded-full bg-crema ${className}`}
    >
      <div className="h-full rounded-full bg-bosque" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Enlace a la transacción en Stellar Expert. Abre en otra pestaña. */
export function ExplorerLink({ href, children = "Stellar Expert" }: { href: string; children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-bosque underline underline-offset-2">
      {children}
    </a>
  );
}

export function TestnetBadge({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${dark ? "border-white/40 text-white" : "border-arena text-secundario"}`}
    >
      Demo en testnet
    </span>
  );
}
