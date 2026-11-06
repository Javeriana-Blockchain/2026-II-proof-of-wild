import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAmount, formatDate } from "@/app/_lib/format";
import { CATEGORY_LABELS, DISPLAY_ASSET, STAGE_LABELS } from "@/app/_lib/labels";
import { ProgressBar } from "@/components/ProgressBar";
import { Timeline } from "@/components/Timeline";
import { TransparencyPanel } from "@/components/TransparencyPanel";
import { getCatalogService } from "@/platform/container";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { codigo } = await params;
  return { title: `Caso ${codigo}` };
}

export default async function CaseDetailPage({ params }: Params) {
  const { codigo } = await params;
  const detail = await getCatalogService().detail(codigo);
  if (!detail) notFound();

  const { case: item } = detail;

  return (
    <main className="space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-sm text-black/60">{item.code}</p>
        <h1 className="text-3xl font-semibold">{item.species ?? "Especie reservada"}</h1>
        <p className="text-black/70">
          {item.centerName} · ingresó el {formatDate(item.intakeDate)} · etapa actual: {STAGE_LABELS[item.stage]}
        </p>
        {item.finalDestination ? (
          <p className="rounded-lg bg-white p-3">Destino final: {item.finalDestination.label}</p>
        ) : null}
        <div className="max-w-md">
          <ProgressBar percent={item.progressPercent} />
          <p className="mt-2 text-sm">
            {formatAmount(item.raisedAmount)} de {formatAmount(item.goalAmount)} ({item.progressPercent} %)
          </p>
        </div>
        {item.finalDestination ? null : (
          <Link
            href={`/casos/${item.code}/apadrinar`}
            className="inline-block rounded-lg bg-[var(--color-acento)] px-5 py-2 font-medium text-white"
          >
            Apadrinar este caso
          </Link>
        )}
      </header>

      <section aria-labelledby="estado">
        <h2 id="estado" className="mb-2 text-xl font-semibold">
          Estado inicial
        </h2>
        <p>{detail.initialState}</p>
      </section>

      <section aria-labelledby="necesidades">
        <h2 id="necesidades" className="mb-2 text-xl font-semibold">
          Meta y necesidades
        </h2>
        <ul className="divide-y divide-black/10 rounded-lg bg-white text-sm">
          {detail.needs.map((need) => (
            <li key={need.category} className="flex justify-between px-4 py-2">
              <span>{CATEGORY_LABELS[need.category]}</span>
              <span>{formatAmount(need.budgetAmount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recuperacion">
        <h2 id="recuperacion" className="mb-4 text-xl font-semibold">
          Línea de tiempo de recuperación
        </h2>
        <Timeline entries={detail.timeline} />
      </section>

      <TransparencyPanel transparency={detail.transparency} assetCode={DISPLAY_ASSET} />
    </main>
  );
}
