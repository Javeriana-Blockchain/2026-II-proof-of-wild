import type { ReactNode } from "react";

/** Íconos de línea del diseño. Heredan el color del texto. */
type Props = { className?: string };

const base = "h-6 w-6";

export function IconoHuella({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <ellipse cx="7" cy="8" rx="2" ry="2.6" />
      <ellipse cx="12" cy="6" rx="2" ry="2.6" />
      <ellipse cx="17" cy="8" rx="2" ry="2.6" />
      <ellipse cx="4.5" cy="13" rx="1.8" ry="2.3" />
      <path d="M12 11c-3 0-6 3.6-6 6.3C6 19.2 7.4 20 9 20c1.2 0 2-.6 3-.6s1.8.6 3 .6c1.6 0 3-.8 3-2.7C18 14.6 15 11 12 11Z" />
    </svg>
  );
}

export function IconoCorazon({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoEscudo({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoPersonas({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-3 3-5 5.5-5s4.9 2 5.5 5" strokeLinecap="round" />
      <path d="M15 5.2a3 3 0 0 1 0 5.6M17 14c1.8.6 3.1 2.4 3.5 5" strokeLinecap="round" />
    </svg>
  );
}

export function IconoCamara({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function IconoCheck({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoFlecha({ className = "h-4 w-4", izquierda = false }: Props & { izquierda?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={className}>
      <path
        d={izquierda ? "M19 12H5m6-6-6 6 6 6" : "M5 12h14m-6-6 6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tipo de etapa según su nombre: un solo juego de pictogramas para todos los casos. */
export type StageKind = "examen" | "medicina" | "alimento" | "recinto" | "entrenamiento" | "liberacion";

export function stageKind(name: string): StageKind {
  const n = name.toLowerCase();
  if (/liberaci|reserva|traslado|seguimiento/.test(n)) return "liberacion";
  if (/entrenamiento|rehabilitaci|vuelo|exterior|adaptaci/.test(n)) return "entrenamiento";
  if (/recinto|estanque|cuidados/.test(n)) return "recinto";
  if (/aliment|dieta|leche|vitamin|calcio|crecimiento/.test(n)) return "alimento";
  if (/valoraci|examen|desparasit/.test(n)) return "examen";
  return "medicina";
}

const STAGE_PATHS: Record<StageKind, ReactNode> = {
  examen: (
    <>
      <path d="M9 4h6v3H9z" strokeLinejoin="round" />
      <path d="M7 5.5H5.5V20h13V5.5H17" strokeLinejoin="round" />
      <path d="m9 13 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  medicina: (
    <>
      <rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)" />
      <path d="m10.1 9.3 3.8 5.4" strokeLinecap="round" />
    </>
  ),
  alimento: (
    <>
      <path d="M5 19c0-8 5-13 14-14-.5 9-5.5 14-14 14Z" strokeLinejoin="round" />
      <path d="M5 19 13 11" strokeLinecap="round" />
    </>
  ),
  recinto: (
    <>
      <path d="M4 20V10l8-5 8 5v10" strokeLinejoin="round" />
      <path d="M8 20v-6M12 20v-6M16 20v-6M4 14h16" strokeLinecap="round" />
    </>
  ),
  entrenamiento: (
    <>
      <path d="M3 15c5 0 9-3 11-9 1.5 4 .5 8-2 10.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18.5c4 .3 8.5-.8 12-5.5 1.5 1.8 2 3.6 1.6 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  liberacion: (
    <>
      <path d="m2.5 19 6.5-10 4.2 6.4L15.5 12l6 7z" strokeLinejoin="round" />
      <circle cx="17.5" cy="6" r="2" />
    </>
  ),
};

export function IconoEtapa({ kind, className = "h-5 w-5" }: Props & { kind: StageKind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      {STAGE_PATHS[kind]}
    </svg>
  );
}

export function IconoMenu({ className = base, abierto = false }: Props & { abierto?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={className}>
      {abierto ? (
        <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function IconoMas({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
