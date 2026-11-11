import type { ReactNode } from "react";
import { VALIDATION_LABELS } from "@/app/_lib/labels";
import type { ValidationLevel } from "@/modules/catalog";
import { ContourField } from "./mapa/ContourField";
import { Reveal } from "@/components/movimiento/Reveal";

/**
 * Botones con forma de placa de sendero (esquinas de letrero, no píldora). Suben al pasar el mouse, se hunden al
 * hacer clic y rebotan un poco al soltar. Bajo «reducir movimiento» solo cambian de color (.mov-hover).
 */
const BUTTONS = {
  primario:
    "bg-bosque text-white hover:bg-profundo focus-visible:outline-bosque",
  secundario:
    "border-2 border-bosque bg-white text-bosque hover:bg-bosque hover:text-white",
  arena:
    "bg-arena text-texto hover:bg-[#cfb684] focus-visible:outline-crema",
  contorno: "border-2 border-white/70 text-white hover:border-white hover:bg-white/10 focus-visible:outline-crema",
} as const;

export type ButtonVariant = keyof typeof BUTTONS;

export function buttonClass(variant: ButtonVariant = "primario", extra = ""): string {
  return [
    "mov-hover inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold leading-tight",
    "transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-(--ease-spring)",
    "hover:-translate-y-0.5 active:translate-y-px active:scale-[0.97] active:duration-75",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-arena disabled:bg-gris disabled:text-secundario disabled:shadow-none",
    BUTTONS[variant],
    extra,
  ].join(" ");
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

/** Rótulo de leyenda del mapa: versalitas condensadas sobre una placa pequeña. */
export function Chip({ tone = "etapa", children, className = "" }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`rotulo inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 leading-none whitespace-nowrap ${CHIP_TONES[tone]} ${className}`}
    >
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

/** Barra de lo cubierto: una regla de mapa con el tramo recorrido en bosque. */
export function ProgressBar({
  percent,
  label = "Porcentaje recaudado",
  className = "",
  tone = "claro",
}: {
  percent: number;
  label?: string;
  className?: string;
  /** «oscuro» sobre fondos profundo o bosque. */
  tone?: "claro" | "oscuro";
}) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label}
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
  return (
    <a href={href} target="_blank" rel="noreferrer" className="enlace inline-flex items-center gap-1">
      {children}
      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">(abre en otra pestaña)</span>
    </a>
  );
}

export function TestnetBadge({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`rotulo inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 leading-none ${dark ? "border-white/40 text-white" : "border-arena bg-white/60 text-secundario"}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 animate-brillo rounded-full ${dark ? "bg-salvia" : "bg-bosque"}`} />
      Demo en testnet
    </span>
  );
}

/** Indicador de carga para botones y paneles. */
export function Spinner({ className = "h-4 w-4", label }: { className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className="inline-flex items-center gap-2">
      <svg viewBox="0 0 24 24" aria-hidden className={`animate-giro ${className}`} fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}

/**
 * Estado vacío: una esquina de mapa sin ruta todavía, el mensaje y, si hay, la acción para seguir.
 */
export function EmptyState({
  title,
  children,
  action,
  tone = "claro",
  className = "",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "claro" | "oscuro";
  className?: string;
}) {
  const dark = tone === "oscuro";
  return (
    <Reveal variant="pop"
      className={`relative isolate overflow-hidden rounded-[28px] px-6 py-12 text-center sm:px-12 ${dark ? "bg-profundo text-white" : "bg-white"} ${className}`}
    >
      <ContourField
        variant={dark ? "noche" : "papel"}
        seed={7}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-70"
      />
      <svg viewBox="0 0 64 64" aria-hidden className={`mx-auto h-14 w-14 ${dark ? "text-salvia" : "text-bosque"}`} fill="none">
        <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 6" />
        <circle cx="32" cy="32" r="6" fill="currentColor" />
      </svg>
      <p className={`mt-4 font-display text-2xl font-semibold ${dark ? "text-white" : "text-texto"}`}>{title}</p>
      {children ? <div className={`mx-auto mt-2 max-w-md ${dark ? "text-white/85" : "text-secundario"}`}>{children}</div> : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </Reveal>
  );
}

/** Bloque de carga: una banda del mapa que respira mientras llegan los datos. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-brillo rounded-2xl bg-arena/45 ${className}`} />;
}
