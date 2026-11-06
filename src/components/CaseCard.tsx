import Link from "next/link";
import { formatAmount } from "@/app/_lib/format";
import { STAGE_LABELS } from "@/app/_lib/labels";
import type { PublicCase } from "@/modules/cases";
import { ProgressBar } from "./ProgressBar";

export function CaseCard({ item }: { item: PublicCase }) {
  return (
    <Link
      href={`/casos/${item.code}`}
      className="block rounded-xl border border-black/10 bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-sm text-black/60">{item.code}</span>
        <span className="rounded-full bg-[var(--color-acento)]/10 px-2 py-0.5 text-xs text-[var(--color-acento)]">
          {STAGE_LABELS[item.stage]}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-medium">{item.species ?? "Especie reservada"}</h2>
      <p className="text-sm text-black/60">{item.centerName}</p>
      <div className="mt-4">
        <ProgressBar percent={item.progressPercent} />
        <p className="mt-2 text-sm">
          {formatAmount(item.raisedAmount)} de {formatAmount(item.goalAmount)} ({item.progressPercent} %)
        </p>
      </div>
    </Link>
  );
}
