import Image from "next/image";
import Link from "next/link";
import { formatAmount } from "@/app/_lib/format";
import { buttonClass, Chip, ProgressBar } from "@/components/ui";
import type { PublicCaseSummary } from "@/modules/catalog";

/**
 * Fila de caso (se repite en la lista de casos y en el perfil de la ONG): foto, especie, historia corta,
 * lo que necesita su tratamiento, costo total y barra de progreso.
 */
export function CaseRow({ item }: { item: PublicCaseSummary }) {
  const name = item.commonName ?? "Especie reservada";
  return (
    <article className="grid overflow-hidden rounded-2xl bg-white shadow-sm md:grid-cols-[22rem_1fr_19rem]">
      <div className="relative min-h-56">
        {item.photoUrl ? (
          <Image src={item.photoUrl} alt={name} fill sizes="(min-width: 768px) 352px, 100vw" className="object-cover" />
        ) : null}
      </div>

      <div className="space-y-3 p-6">
        <p className="flex flex-wrap items-center gap-2 text-sm text-secundario">
          <Chip tone={item.chip.tone === "logro" ? "logro" : "etapa"}>{item.chip.label}</Chip>
          <span>
            {item.code} ·{" "}
            <Link href={`/ong/${item.ngo.slug}`} className="text-bosque underline">
              {item.ngo.name}
            </Link>
          </span>
        </p>
        <h2 className="text-3xl">{name}</h2>
        <p>{item.shortStory}</p>
        {item.needs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-secundario">{item.recovered ? "Necesitó:" : "Necesita:"}</span>
            {item.needs.map((need) => (
              <span key={need} className="rounded-full bg-arena/45 px-3 py-1">
                {need}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-center gap-3 border-t border-arena/50 p-6 md:border-t-0 md:border-l">
        <p className="text-sm text-secundario">Costo total del tratamiento</p>
        <p className="font-serif text-3xl">{formatAmount(item.goal)}</p>
        <ProgressBar percent={item.progressPercent} />
        <p className="text-sm">
          <strong>{formatAmount(item.raised)}</strong>{" "}
          {item.progressPercent >= 100 ? "· meta cumplida" : "recaudados"}
        </p>
        {item.recovered ? (
          <Link href={`/casos/${item.code}`} className={buttonClass("secundario")}>
            Ver su historia
          </Link>
        ) : (
          <div className="flex gap-2">
            {item.progressPercent < 100 ? (
              <Link href={`/casos/${item.code}?apadrinar=1`} className={buttonClass("primario", "flex-1")}>
                Apadrinar
              </Link>
            ) : null}
            <Link href={`/casos/${item.code}`} className={buttonClass("secundario", "flex-1")}>
              Ver caso
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
