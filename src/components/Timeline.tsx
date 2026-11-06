import { formatDate } from "@/app/_lib/format";
import { STAGE_LABELS } from "@/app/_lib/labels";
import type { PublicTimelineEntry } from "@/modules/catalog";

export function Timeline({ entries }: { entries: PublicTimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-black/60">Aún no hay hitos publicados para este caso.</p>;
  }
  return (
    <ol className="space-y-4 border-l-2 border-black/10 pl-5">
      {entries.map((entry) => (
        <li key={entry.anchorTxHash} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-[var(--color-acento)]" />
          <p className="text-sm text-black/60">{formatDate(entry.occurredAt)}</p>
          <p className="font-medium">{STAGE_LABELS[entry.stage]}</p>
          <p>{entry.description}</p>
          <p className="mt-1 text-xs text-black/60">
            {entry.validationLabel} ·{" "}
            <a className="underline" href={entry.anchorUrl} target="_blank" rel="noreferrer">
              ver registro en Stellar
            </a>
            {entry.validationUrl ? (
              <>
                {" · "}
                <a className="underline" href={entry.validationUrl} target="_blank" rel="noreferrer">
                  ver validación
                </a>
              </>
            ) : null}
          </p>
        </li>
      ))}
    </ol>
  );
}
