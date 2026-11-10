import Image from "next/image";
import Link from "next/link";
import { formatAmount } from "@/app/_lib/format";
import { ContourField } from "@/components/mapa/ContourField";
import { RouteMap } from "@/components/mapa/RouteMap";
import { buttonClass, Chip } from "@/components/ui";
import type { PublicCaseSummary } from "@/modules/catalog";

const CAMINOS = [
  {
    titulo: "Para donantes",
    texto: "Apadrina un caso y ve en qué se usa cada dólar de tu aporte.",
    accion: "Quiero ser donante",
    href: "/#casos",
  },
  {
    titulo: "Para ONG",
    texto: "Visibilidad y credibilidad para recibir aportes.",
    accion: "Soy ONG y quiero aparecer",
    href: "/ong/registro",
  },
  {
    titulo: "Para voluntarios",
    texto: "Ayuda con tu tiempo en una fundación.",
    accion: "Quiero ser voluntario",
    href: "/#voluntariados",
  },
];

/**
 * Primera pantalla: la promesa, los tres caminos y, abajo a todo el ancho, la ruta viva de un caso en tratamiento
 * con el marcador «Aquí va» en la etapa que se está cubriendo.
 */
export function Portada({ destacado }: { destacado: PublicCaseSummary | null }) {
  return (
    <section id="inicio" aria-labelledby="titulo-inicio" className="relative isolate overflow-hidden bg-profundo text-white">
      <ContourField variant="noche" seed={3} className="absolute inset-0 -z-10 h-full w-full" />

      <div className="mx-auto grid max-w-7xl items-stretch gap-10 px-4 pt-10 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:pt-12">
        <div className="flex flex-col justify-center">
          <h1
            id="titulo-inicio"
            data-reveal="sube"
            className="max-w-3xl text-5xl leading-[1.02] font-bold sm:text-6xl 2xl:text-7xl"
          >
            Apadrina a un animal rescatado y sigue cada paso de su recuperación
          </h1>
          <p data-reveal="sube" style={{ ["--d" as string]: 1 }} className="mt-5 max-w-xl text-xl text-white/90">
            Todo queda registrado en Stellar y lo puedes verificar.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {CAMINOS.map((c, i) => (
              <li
                key={c.titulo}
                data-reveal="pop"
                style={{ ["--d" as string]: 2 + i }}
                className="flex flex-col rounded-2xl border border-white/20 bg-profundo p-4 transition-colors duration-300 hover:border-arena/70"
              >
                <h2 className="font-sans text-base font-bold">{c.titulo}</h2>
                <p className="mt-1 flex-1 text-sm text-white/85">{c.texto}</p>
                <Link href={c.href} className={buttonClass("arena", "mt-4 w-full px-3 text-center text-sm")}>
                  {c.accion}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <figure data-reveal="capa" style={{ ["--d" as string]: 1 }} className="relative mx-auto w-full max-w-md lg:mr-6 lg:max-w-none">
          {/* Capas de papel recortado detrás de la foto: profundidad solo por superposición. */}
          <span aria-hidden className="absolute -right-3 -bottom-3 h-full w-full rounded-[32px] bg-arena" />
          <span aria-hidden className="absolute -right-6 -bottom-6 h-full w-full rounded-[32px] bg-salvia/80" />
          <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] ring-4 ring-crema sm:aspect-square lg:aspect-auto lg:h-full lg:min-h-[24rem]">
            <Image
              src="/fotos/portada-oso-de-anteojos.webp"
              alt="Dos osos de anteojos en un pastizal de páramo"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover object-[78%_50%]"
            />
          </div>
        </figure>
      </div>

      {destacado ? (
        <div className="border-t border-white/15">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-center">
            <div data-reveal="sube" className="space-y-2">
              <p className="font-display text-3xl font-bold">
                <Link href={`/casos/${destacado.code}`} className="transition-colors hover:text-arena">
                  {destacado.commonName ?? "Especie reservada"}
                </Link>
              </p>
              <p className="flex flex-wrap items-center gap-2 text-sm text-white/80">
                <Chip tone="oscuro" className="cifras">
                  {destacado.code}
                </Chip>
                <span className="cifras">
                  {formatAmount(destacado.raised, "")} de {formatAmount(destacado.goal)}
                </span>
              </p>
              <Link href={`/casos/${destacado.code}`} className="inline-flex items-center gap-1 pt-1 font-semibold text-arena underline decoration-arena/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-arena">
                Ver su recuperación
              </Link>
            </div>
            <RouteMap
              stages={destacado.route}
              tone="oscuro"
              label={`Ruta del tratamiento de ${destacado.commonName ?? destacado.code}`}
              className="pt-8 sm:pt-6"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
