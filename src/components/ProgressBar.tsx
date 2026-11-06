export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label="Porcentaje recaudado"
      className="h-2 w-full overflow-hidden rounded-full bg-black/10"
    >
      <div className="h-full rounded-full bg-[var(--color-acento)]" style={{ width: `${percent}%` }} />
    </div>
  );
}
