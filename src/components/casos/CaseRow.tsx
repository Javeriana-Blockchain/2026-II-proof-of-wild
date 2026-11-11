import Image from "next/image";
import Link from "next/link";
import { formatAmount } from "@/app/_lib/format";
import { RouteMap } from "@/components/mapa/RouteMap";
import { buttonClass, Chip, ProgressBar } from "@/components/ui";
import type { PublicCaseSummary } from "@/modules/catalog";
import { Reveal } from "@/components/movimiento/Reveal";

/**
 * Hoja de ruta de un caso (en la página principal y en el perfil de la ONG): la foto grande, el animal, su historia
 * corta, la ruta del tratamiento etapa por etapa y cuánto se ha cubierto.
 */
export function CaseRow({ item, delay = 0 }: { item: PublicCaseSummary; delay?: number }) {
  const name = item.commonName ?? "Especie reservada";
  return (
    <Reveal as="article" variant="capa" delay={delay}
      className="group/caso grid overflow-hidden rounded-[28px] bg-white ring-1 ring-arena/60 hover:ring-bosque/60 transition-[box-shadow,transform] duration-300 ease-(--ease-out-expo) hover:-translate-y-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <Link
        href={`/casos/${item.code}`}
        tabIndex={-1}
        aria-hidden
        className="relative block min-h-64 overflow-hidden bg-salvia lg:min-h-full"
      >
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/caso:scale-[1.04]"
          />
        ) : null}
        <span className="absolute top-4 left-4">
          <Chip tone={item.chip.tone === "logro" ? "logro" : "etapa"}>{item.chip.label}</Chip>
        </span>
      </Link>

      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="space-y-2">
          <h3 className="text-4xl">
            <Link href={`/casos/${item.code}`} className="transition-colors hover:text-bosque">
              {name}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 text-secundario">
            {item.scientificName ? <span className="cientifico text-lg">{item.scientificName}</span> : null}
            {item.scientificName ? <span aria-hidden>·</span> : null}
            <span className="cifras text-sm font-semibold">{item.code}</span>
            <span aria-hidden>·</span>
            <Link href={`/ong/${item.ngo.slug}`} className="enlace text-sm">
              {item.ngo.name}
            </Link>
          </p>
          <p className="max-w-prose pt-1 text-lg">{item.shortStory}</p>
        </div>

        <RouteMap stages={item.route} size="compacto" label={`Ruta del tratamiento de ${name}`} className="py-2" />

        <div className="mt-auto grid items-end gap-4 border-t border-arena/60 pt-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="cifras font-display text-3xl font-bold">{formatAmount(item.raised, "")}</span>
              <span className="text-secundario">
                de {formatAmount(item.goal)} {item.progressPercent >= 100 ? "· meta cumplida" : "recaudados"}
              </span>
            </p>
            <ProgressBar percent={item.progressPercent} />
          </div>
          {item.recovered ? (
            <Link href={`/casos/${item.code}`} className={buttonClass("secundario")}>
              Ver su historia
            </Link>
          ) : (
            <div className="flex flex-wrap gap-2">
              {item.progressPercent < 100 ? (
                <Link href={`/casos/${item.code}?apadrinar=1`} className={buttonClass("primario")}>
                  Apadrinar
                </Link>
              ) : null}
              <Link href={`/casos/${item.code}`} className={buttonClass("secundario")}>
                Ver caso
              </Link>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

/** Caso recuperado, en formato corto: la foto, el resultado y su historia. */
export function RecoveredCard({ item, delay = 0 }: { item: PublicCaseSummary; delay?: number }) {
  const name = item.commonName ?? "Especie reservada";
  return (
    <Reveal as="article" variant="pop" delay={delay}
      className="group/rec relative overflow-hidden rounded-[24px] bg-white ring-1 ring-arena/60 hover:ring-bosque/60 transition-[transform,box-shadow,--tw-ring-color] duration-300 ease-(--ease-spring) hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-salvia">
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt={name}
            fill
            sizes="(min-width: 1024px) 26vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/rec:scale-[1.05]"
          />
        ) : null}
        <span className="absolute top-3 left-3">
          <Chip tone={item.chip.tone === "logro" ? "logro" : "etapa"}>{item.chip.label}</Chip>
        </span>
      </div>
      <div className="space-y-1 p-5">
        <h3 className="text-2xl">{name}</h3>
        {item.scientificName ? <p className="cientifico text-secundario">{item.scientificName}</p> : null}
        <p className="cifras pt-1 text-sm text-secundario">
          {formatAmount(item.raised)} · {item.ngo.name}
        </p>
        <Link
          href={`/casos/${item.code}`}
          className="enlace mt-2 inline-flex items-center gap-1 after:absolute after:inset-0 after:content-['']"
        >
          Ver su historia
        </Link>
      </div>
    </Reveal>
  );
}
