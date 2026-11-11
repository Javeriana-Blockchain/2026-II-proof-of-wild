import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAmount, formatDate } from "@/app/_lib/format";
import { ContourField } from "@/components/mapa/ContourField";
import { Reveal } from "@/components/movimiento/Reveal";
import { Chip, EmptyState, ExplorerLink, ProgressBar } from "@/components/ui";
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
      <Reveal
        as="header"
        variant="capa"
        className="relative isolate grid gap-6 overflow-hidden rounded-[32px] bg-profundo p-8 text-white lg:grid-cols-[auto_1fr_auto] lg:items-center"
      >
        <ContourField variant="noche" seed={13} className="absolute inset-0 -z-10 h-full w-full" />
        <div className="relative h-36 w-36 overflow-hidden rounded-[24px] bg-crema ring-4 ring-crema">
          {ngo.photoPath ? <Image src={ngo.photoPath} alt="" fill sizes="128px" className="object-cover" /> : null}
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold sm:text-6xl">{ngo.name}</h1>
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
        <div className="space-y-1 rounded-[20px] border border-white/25 bg-profundo p-5">
          <p className="rotulo text-salvia">Cuenta en Stellar</p>
          <p className="font-mono">{shortAccount(ngo.stellarAccount)}</p>
          <a
            href={explorerAccountUrl(explorer, ngo.stellarAccount)}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-arena underline decoration-arena/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-arena"
          >
            Ver en Stellar Expert
          </a>
        </div>
      </Reveal>

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {indicators.map(([label, value], i) => (
          <Reveal
            key={label}
            variant="pop"
            delay={i}
            className={`rounded-[22px] p-5 ${i === 4 ? "bg-bosque text-white" : "bg-white ring-1 ring-arena/70"}`}
          >
            <dt className={`rotulo ${i === 4 ? "text-white/80" : "text-secundario"}`}>{label}</dt>
            <dd className="cifras mt-1 font-display text-3xl font-bold">{value}</dd>
          </Reveal>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[2.3fr_1fr]">
        <section aria-labelledby="casos-ong" className="space-y-4">
          <h2 id="casos-ong" className="text-3xl">
            Casos de la ONG
          </h2>
          {own.length === 0 ? (
            <EmptyState title="Esta ONG aún no publica casos.">Cuando publique uno, aquí verás su historia y su ruta.</EmptyState>
          ) : null}
          {own.map((c, i) => (
            <Reveal
              as="article"
              variant="pop"
              delay={i}
              key={c.code}
              className="group/caso relative grid overflow-hidden rounded-[24px] bg-white ring-1 ring-arena/70 transition-[transform,box-shadow] duration-300 ease-(--ease-spring) hover:-translate-y-1 hover:shadow-[0_22px_44px_-30px_rgb(31_42_34/0.6)] sm:grid-cols-[12rem_1fr]"
            >
              <div className="relative min-h-36 overflow-hidden bg-salvia">
                {c.photoUrl ? (
                  <Image
                    src={c.photoUrl}
                    alt={c.commonName ?? ""}
                    fill
                    sizes="192px"
                    className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/caso:scale-[1.06]"
                  />
                ) : null}
              </div>
              <div className="space-y-3 p-5">
                <p className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-2xl font-semibold">{c.commonName ?? "Especie reservada"}</span>
                  <Chip tone={c.chip.tone === "logro" ? "logro" : "etapa"} className="text-xs">
                    {c.chip.label}
                  </Chip>
                  <span className="text-sm text-secundario">{c.code}</span>
                </p>
                <div className="flex items-center gap-3">
                  <ProgressBar percent={c.progressPercent} className="max-w-xs" />
                  <span className="cifras text-sm">
                    {formatAmount(c.raised, "")}de {formatAmount(c.goal)}
                    {c.progressPercent >= 100 ? " · meta cumplida" : ""}
                  </span>
                </div>
                {c.recovered && c.outcomeDate ? (
                  <p className="text-sm text-secundario">
                    {c.outcomeLabel} el {formatDate(c.outcomeDate)}
                  </p>
                ) : null}
                <Link href={`/casos/${c.code}`} className="enlace after:absolute after:inset-0 after:content-['']">
                  {c.recovered ? "Ver su historia" : "Ver caso"}
                </Link>
              </div>
            </Reveal>
          ))}
        </section>

        <aside className="space-y-6">
          <section className="space-y-3 rounded-[24px] bg-white p-6 ring-1 ring-arena/70">
            <h2 className="text-2xl">Voluntariados</h2>
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
            <Link href="/#voluntariados" className="enlace">
              Ver voluntariados
            </Link>
          </section>

          <section className="space-y-3 rounded-[24px] bg-white p-6 ring-1 ring-arena/70">
            <h2 className="text-2xl">Gastos recientes</h2>
            {ngo.recentExpenses.length === 0 ? (
              <p className="text-secundario">Todavía no hay gastos registrados.</p>
            ) : (
              <ul className="divide-y divide-arena/50">
                {ngo.recentExpenses.map((e) => (
                  <li key={e.txHash} className="flex items-baseline justify-between gap-3 py-2">
                    <span>
                      {e.label} · {e.caseCode}{" "}
                      <ExplorerLink href={explorerTxUrl(explorer, e.txHash)}>
                        <span className="sr-only">Ver el pago en Stellar Expert</span>
                      </ExplorerLink>
                    </span>
                    <strong className="cifras whitespace-nowrap">{formatAmount(e.amount)}</strong>
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
