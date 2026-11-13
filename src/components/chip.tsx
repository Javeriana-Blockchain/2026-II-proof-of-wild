import type { ReactNode } from "react";

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
