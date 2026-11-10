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
