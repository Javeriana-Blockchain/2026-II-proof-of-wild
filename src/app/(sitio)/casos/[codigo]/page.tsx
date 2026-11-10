import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAmount, formatDate } from "@/app/_lib/format";
import { ContributionsTable } from "@/components/casos/ContributionsTable";
import { StageTimeline } from "@/components/casos/StageTimeline";
import { TransparencyPanel } from "@/components/casos/TransparencyPanel";
import { IconoFlecha } from "@/components/iconos";
import { buttonClass, Chip, ProgressBar } from "@/components/ui";
import { getCatalogService } from "@/platform/container";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ pestana?: string }>;
};

const TABS = [
  { id: "linea", label: "Línea de tiempo" },
  { id: "transparencia", label: "Panel de transparencia" },
  { id: "aportes", label: "Aportes recibidos" },
] as const;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { codigo } = await params;
  const detail = await getCatalogService().caseDetail(codigo);
  if (!detail) return { title: "Caso no encontrado" };
  const name = detail.commonName ?? "Especie reservada";
  return { title: `${name} · ${detail.code}`, description: detail.shortStory };
}

/** Detalle del caso: la pantalla principal de la demo. Cabecera, historia, bloque de apoyo y tres pestañas. */
export default async function CaseDetailPage({ params, searchParams }: Params) {
  const [{ codigo }, { pestana }] = await Promise.all([params, searchParams]);
  const detail = await getCatalogService().caseDetail(codigo);
  if (!detail) notFound();

  const tab = TABS.find((t) => t.id === pestana)?.id ?? "linea";
  const name = detail.commonName ?? "Especie reservada";
  const canSponsor = !detail.recovered && Number(detail.remaining) > 0;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8">
      <Link href="/casos" className="inline-flex items-center gap-2 font-medium text-bosque underline">
        <IconoFlecha izquierda /> Volver a casos
      </Link>

      <header className="grid gap-8 lg:grid-cols-[1fr_1.4fr_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-md">
          {detail.photoUrl ? (
            <Image src={detail.photoUrl} alt={name} fill priority sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
          ) : null}
        </div>

        <div className="space-y-3">
          <Chip tone={detail.chip.tone === "logro" ? "logro" : "etapa"}>{detail.chip.label}</Chip>
          <p className="text-secundario">
            {detail.code} · Ingresó el {formatDate(detail.intakeDate)}
            {detail.recovered && detail.outcomeDate ? ` · ${detail.outcomeLabel} el ${formatDate(detail.outcomeDate)}` : ""}
          </p>
          <h1 className="text-5xl leading-tight sm:text-6xl">{name}</h1>
          {detail.scientificName ? <p className="text-secundario italic">{detail.scientificName}</p> : null}
          <Link href={`/ong/${detail.ngo.slug}`} className="block text-lg font-semibold text-bosque underline">
            {detail.ngo.name}
          </Link>
          <p className="text-lg leading-relaxed">{detail.story}</p>
        </div>

        <aside className="flex flex-col justify-center gap-4 self-start rounded-2xl border border-arena bg-white p-7">
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-secundario">Costo total</p>
              <p className="font-serif text-3xl">{formatAmount(detail.goal)}</p>
            </div>
            <div>
              <p className="text-sm text-secundario">Recaudado</p>
              <p className="font-serif text-3xl">{formatAmount(detail.raised)}</p>
            </div>
          </div>
          <ProgressBar percent={detail.progressPercent} />
          {canSponsor ? (
            <>
              <p>
                Faltan <strong>{formatAmount(detail.remaining)}</strong>
              </p>
              <Link href={`/casos/${detail.code}?pestana=${tab}&apadrinar=1`} className={buttonClass("primario", "py-3 text-lg")}>
                Apadrinar este caso <IconoFlecha />
              </Link>
            </>
          ) : (
            <p className="font-medium text-bosque">
              {detail.recovered ? `Meta cumplida · ${detail.outcomeLabel}` : "Meta cumplida"}
            </p>
          )}
        </aside>
      </header>

      <nav aria-label="Secciones del caso" className="flex flex-wrap gap-3 border-b border-arena pb-4">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/casos/${detail.code}?pestana=${t.id}`}
            scroll={false}
            aria-current={t.id === tab ? "page" : undefined}
            className={`rounded-full px-5 py-2.5 text-lg font-medium transition ${
              t.id === tab ? "bg-bosque text-white" : "border border-arena bg-white hover:border-bosque"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "linea" ? <StageTimeline stages={detail.stages} /> : null}
      {tab === "transparencia" ? <TransparencyPanel transparency={detail.transparency} /> : null}
      {tab === "aportes" ? <ContributionsTable contributions={detail.contributions} /> : null}
    </main>
  );
}
