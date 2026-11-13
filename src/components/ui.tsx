import type { ReactNode } from "react";
import { ContourField } from "./mapa/ContourField";
import { Reveal } from "@/components/movimiento/Reveal";

export { Chip, type ChipTone } from "./chip";
export { ExplorerLink, ProgressBar, TestnetBadge, ValidationChip } from "./ui-cliente";

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
