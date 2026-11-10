import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAmount, formatDate } from "@/app/_lib/format";
import { Chip, ExplorerLink, ProgressBar } from "@/components/ui";
import { explorerAccountUrl, explorerTxUrl } from "@/lib/explorer";
import { shortAccount } from "@/lib/stellar-account";
import { getExplorerEnv } from "@/platform/config/env";
import { getCatalogService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { getPublicNgo } from "@/platform/db/repositories/ngo-profile";
import { listVolunteerings } from "@/platform/db/repositories/volunteering";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const KIND_LABELS = { centro_atencion: "Centro de atención y valoración", fundacion: "Fundación", ong: "ONG" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ngo = await getPublicNgo(getDb(), (await params).slug);
  return ngo ? { title: ngo.name, description: ngo.description } : { title: "ONG no encontrada" };
}

/** Pantalla 6: perfil de una ONG verificada, lo que da visibilidad a los centros poco conocidos. */
export default async function OngProfilePage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();
  const ngo = await getPublicNgo(db, slug);
  if (!ngo) notFound();

  const explorer = getExplorerEnv().EXPLORER_BASE_URL;
  const [allCases, volunteering] = await Promise.all([getCatalogService().listCases(), listVolunteerings(db)]);
  const own = allCases.filter((c) => c.ngo.slug === ngo.slug);
  const released = own.filter((c) => c.outcome === "liberado").length;
  const invoicedPct =
    Number(ngo.totals.spent) > 0 ? Math.round((Number(ngo.totals.spentWithInvoice) / Number(ngo.totals.spent)) * 100) : 100;
  const indicators: Array<[string, string]> = [
    ["Casos atendidos", String(own.length)],
    ["Animales liberados", String(released)],
    ["Total recibido", formatAmount(ngo.totals.received)],
    ["Total gastado", formatAmount(ngo.totals.spent)],
    ["Gastos con factura", `${invoicedPct} %`],
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
      <header className="grid gap-6 rounded-3xl bg-profundo p-8 text-white lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="relative h-32 w-32 overflow-hidden rounded-2xl bg-crema">
          {ngo.photoPath ? <Image src={ngo.photoPath} alt="" fill sizes="128px" className="object-cover" /> : null}
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl">{ngo.name}</h1>
          <p className="flex flex-wrap gap-2">
            <Chip tone="oscuro">
              {KIND_LABELS[ngo.kind]} · {ngo.city}
            </Chip>
            <Chip tone="salvia">Perfil aprobado</Chip>
          </p>
          <p className="max-w-2xl text-white/90">
            {ngo.description}
            {ngo.foundedYear ? ` Trabajamos desde ${ngo.foundedYear}.` : ""}
          </p>
        </div>
        <div className="space-y-1 rounded-2xl border border-white/25 bg-white/10 p-5">
          <p className="text-sm text-white/80">Cuenta en Stellar</p>
          <p className="font-mono">{shortAccount(ngo.stellarAccount)}</p>
          <a href={explorerAccountUrl(explorer, ngo.stellarAccount)} target="_blank" rel="noreferrer" className="font-medium underline">
            Ver en Stellar Expert
          </a>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {indicators.map(([label, value], i) => (
          <div key={label} className={`rounded-2xl bg-white p-5 ${i === 4 ? "ring-2 ring-bosque" : ""}`}>
            <dt className="text-sm text-secundario">{label}</dt>
            <dd className="mt-1 font-serif text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[2.3fr_1fr]">
        <section aria-labelledby="casos-ong" className="space-y-4">
          <h2 id="casos-ong" className="text-3xl">
            Casos de la ONG
          </h2>
          {own.map((c) => (
            <article key={c.code} className="grid overflow-hidden rounded-2xl bg-white shadow-sm sm:grid-cols-[12rem_1fr]">
              <div className="relative min-h-36">
                {c.photoUrl ? <Image src={c.photoUrl} alt={c.commonName ?? ""} fill sizes="192px" className="object-cover" /> : null}
              </div>
              <div className="space-y-3 p-5">
                <p className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold">{c.commonName ?? "Especie reservada"}</span>
                  <Chip tone={c.chip.tone === "logro" ? "logro" : "etapa"} className="text-xs">
                    {c.chip.label}
                  </Chip>
                  <span className="text-sm text-secundario">{c.code}</span>
                </p>
                <div className="flex items-center gap-3">
                  <ProgressBar percent={c.progressPercent} className="max-w-xs" />
                  <span className="text-sm">
                    {formatAmount(c.raised, "")}de {formatAmount(c.goal)}
                    {c.progressPercent >= 100 ? " · meta cumplida" : ""}
                  </span>
                </div>
                {c.recovered && c.outcomeDate ? (
                  <p className="text-sm text-secundario">
                    {c.outcomeLabel} el {formatDate(c.outcomeDate)}
                  </p>
                ) : null}
                <Link href={`/casos/${c.code}`} className="font-medium text-bosque underline">
                  {c.recovered ? "Ver su historia" : "Ver caso"}
                </Link>
              </div>
            </article>
          ))}
        </section>

        <aside className="space-y-6">
          <section className="space-y-3 rounded-2xl bg-white p-6">
            <h2 className="font-sans text-xl font-semibold">Voluntariados</h2>
            {volunteering.filter((v) => v.ngo.slug === ngo.slug).length === 0 ? (
              <p className="text-secundario">Por ahora no tiene jornadas abiertas.</p>
            ) : (
              volunteering
                .filter((v) => v.ngo.slug === ngo.slug)
                .map((v) => (
                  <p key={v.id}>
                    <strong>{formatDate(v.date)}</strong> · {v.title}: {v.tasks.join(", ").toLowerCase()}.
                  </p>
                ))
            )}
            <Link href="/#voluntariados" className="font-medium text-bosque underline">
              Ver voluntariados
            </Link>
          </section>

          <section className="space-y-3 rounded-2xl bg-white p-6">
            <h2 className="font-sans text-xl font-semibold">Gastos recientes</h2>
            {ngo.recentExpenses.length === 0 ? (
              <p className="text-secundario">Todavía no hay gastos registrados.</p>
            ) : (
              <ul className="divide-y divide-arena/50">
                {ngo.recentExpenses.map((e) => (
                  <li key={e.txHash} className="flex items-baseline justify-between gap-3 py-2">
                    <span>
                      {e.label} · {e.caseCode}{" "}
                      <ExplorerLink href={explorerTxUrl(explorer, e.txHash)}>
                        <span className="sr-only">Ver el pago en </span>↗
                      </ExplorerLink>
                    </span>
                    <strong className="whitespace-nowrap">{formatAmount(e.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
