import Image from "next/image";
import Link from "next/link";
import { formatAmount } from "@/app/_lib/format";
import { ContourField } from "@/components/mapa/ContourField";
import { RouteMap } from "@/components/mapa/RouteMap";
import { buttonClass, Chip } from "@/components/ui";
import type { PublicCaseSummary } from "@/modules/catalog";
import { Reveal } from "@/components/movimiento/Reveal";

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
export function Portada({ destacado, contractUrl }: { destacado: PublicCaseSummary | null; contractUrl: string | null }) {
  return (
    <section id="inicio" aria-labelledby="titulo-inicio" className="relative isolate overflow-hidden bg-profundo text-white">
      <ContourField variant="noche" seed={3} className="absolute inset-0 -z-10 h-full w-full" />

      <div className="mx-auto grid max-w-7xl items-stretch gap-10 px-4 pt-10 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:pt-12">
        <div className="flex flex-col justify-center">
          <Reveal as="h1" variant="sube"
            id="titulo-inicio"
            className="max-w-3xl text-5xl leading-[1.02] font-bold sm:text-6xl 2xl:text-7xl"
          >
            Apadrina a un animal rescatado y sigue cada paso de su recuperación
          </Reveal>
          <Reveal as="p" variant="sube" delay={1} className="mt-5 max-w-xl text-xl text-white/90">
            Todo queda registrado en Stellar y lo puedes verificar.
          </Reveal>

          <Reveal
            as="ul"
            variant="pop"
            delay={2}
            className="mt-8 divide-y divide-white/15 rounded-[24px] border border-white/20 bg-profundo"
          >
            {CAMINOS.map((c) => (
              <li
                key={c.titulo}
                className="grid items-center gap-3 px-5 py-4 transition-colors duration-300 hover:bg-bosque/40 sm:grid-cols-[minmax(0,1fr)_15rem]"
              >
                <div>
                  <h2 className="font-sans text-base font-bold">{c.titulo}</h2>
                  <p className="text-sm text-white/85">{c.texto}</p>
                </div>
                <Link href={c.href} className={buttonClass("arena", "w-full px-3 py-2.5 text-center text-sm")}>
                  {c.accion}
                </Link>
              </li>
            ))}
          </Reveal>
        </div>

        <Reveal as="figure" variant="capa" delay={1} className="relative mx-auto my-4 w-full max-w-md lg:my-2 lg:mr-4 lg:max-w-none">
          {/* Paspartú de curvas de nivel: la foto descansa sobre una hoja del mapa, profundidad solo por capas. */}
          <span aria-hidden className="absolute -inset-3 overflow-hidden rounded-[40px] sm:-inset-4">
            <ContourField variant="papel" seed={17} className="h-full w-full" />
          </span>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[30px] sm:aspect-square lg:aspect-auto lg:h-full lg:min-h-[24rem]">
            <Image
              src="/fotos/portada-oso-de-anteojos.webp"
              alt="Dos osos de anteojos en un pastizal de páramo"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover object-[78%_50%]"
            />
          </div>
        </Reveal>
      </div>

      {destacado ? (
        <div className="border-t border-white/15">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-center">
            <Reveal variant="sube" className="space-y-2">
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
              <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <Link
                  href={`/casos/${destacado.code}`}
                  className="font-semibold text-arena underline decoration-arena/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-arena"
                >
                  Ver su recuperación
                </Link>
                {contractUrl ? (
                  <a
                    href={contractUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-white/90 underline decoration-white/30 underline-offset-4 transition-[color,text-decoration-color] hover:text-white hover:decoration-white"
                  >
                    El contrato en Stellar Expert
                    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="sr-only">(abre en otra pestaña)</span>
                  </a>
                ) : null}
              </p>
            </Reveal>
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
