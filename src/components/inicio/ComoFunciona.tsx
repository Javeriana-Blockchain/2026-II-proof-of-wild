import Link from "next/link";
import type { ComponentType } from "react";
import { IconoCorazon, IconoEscudo, IconoHuella, IconoMas, IconoPersonas } from "@/components/iconos";
import { buttonClass, type ButtonVariant } from "@/components/ui";
import { Reveal } from "@/components/movimiento/Reveal";
import { getT } from "@/i18n/servidor";
import type { Clave } from "@/i18n/traductor";

const PASOS = [
  { icono: IconoHuella, clave: "paso1" },
  { icono: IconoCorazon, clave: "paso2" },
  { icono: IconoEscudo, clave: "paso3" },
] as const;

type Camino = {
  clave: "donante" | "ong" | "voluntario";
  icono: ComponentType<{ className?: string }>;
  placa: string;
  accion: { texto: Clave; href: string; variante: ButtonVariant };
};

const CAMINOS: Camino[] = [
  {
    clave: "donante",
    icono: IconoCorazon,
    placa: "bg-profundo text-white",
    accion: { texto: "inicio.como.donante.accion", href: "/#casos", variante: "primario" },
  },
  {
    clave: "ong",
    icono: IconoEscudo,
    placa: "bg-bosque text-white",
    accion: { texto: "inicio.soyOngAparecer", href: "/ong/registro", variante: "secundario" },
  },
  {
    clave: "voluntario",
    icono: IconoPersonas,
    placa: "bg-salvia text-texto",
    accion: { texto: "inicio.como.voluntario.accion", href: "/#voluntariados", variante: "secundario" },
  },
];

/** Cada camino tiene tres pasos, cada uno con una frase en negrita y su explicación. */
const PASOS_CAMINO = [1, 2, 3] as const;

const PREGUNTAS = ["billetera", "verificado", "blockchain", "cuenta"] as const;

/** «Cómo funciona»: los tres pasos del donante como un sendero, los tres caminos y las preguntas frecuentes. */
export async function ComoFunciona() {
  const { t, ruta } = await getT();
  return (
    <section id="como-funciona" aria-labelledby="titulo-como" className="mx-auto max-w-7xl space-y-16 px-4 py-20 sm:px-8">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
        <Reveal as="h2" variant="sube" id="titulo-como" className="text-5xl sm:text-6xl">
          {t("inicio.como.titulo")}
        </Reveal>
        <Reveal as="p" variant="sube" delay={1} className="max-w-lg text-xl text-secundario lg:justify-self-end">
          {t("inicio.como.subtitulo")}
        </Reveal>
      </header>

      {/* Los tres pasos del donante, unidos por el sendero. */}
      <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
        <svg
          viewBox="0 0 1000 40"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-x-[16%] top-5 hidden h-10 w-[68%] md:block"
        >
          <path
            d="M0 20 Q250 2 500 20 T1000 20"
            fill="none"
            stroke="#386641"
            strokeOpacity={0.45}
            strokeWidth={2}
            strokeDasharray="2 8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {PASOS.map(({ icono: Icono, clave }, i) => (
          <Reveal as="li" variant="pop" delay={i} key={clave} className="relative flex flex-col items-start md:items-center md:text-center">
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-bosque ring-4 ring-crema transition-transform duration-300 ease-(--ease-spring) hover:scale-110">
              <Icono className="h-8 w-8" />
              <span className="cifras absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-bosque text-sm font-bold text-white">
                {i + 1}
              </span>
            </span>
            <h3 className="mt-5 text-3xl">{t(`inicio.como.${clave}.titulo`)}</h3>
            <p className="mt-2 max-w-xs text-lg text-secundario">{t(`inicio.como.${clave}.texto`)}</p>
          </Reveal>
        ))}
      </ol>

      {/* Tres caminos: cada uno es un sendero con su placa de inicio y su salida. */}
      <div className="space-y-4">
        {CAMINOS.map(({ clave, icono: Icono, placa, accion }, i) => (
          <Reveal as="section" variant="capa" delay={i}
            key={clave}
            aria-label={t(`inicio.como.${clave}.titulo`)}
            className="group/camino grid overflow-hidden rounded-[28px] bg-white ring-1 ring-arena/60 hover:ring-bosque/60 transition-shadow duration-300 lg:grid-cols-[17rem_minmax(0,1fr)_auto]"
          >
            <h3 className={`flex items-center gap-4 px-6 py-6 text-3xl lg:px-7 ${placa}`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crema text-bosque transition-transform duration-300 ease-(--ease-spring) group-hover/camino:-rotate-6">
                <Icono className="h-6 w-6" />
              </span>
              {t(`inicio.como.${clave}.titulo`)}
            </h3>
            <ol className="grid gap-5 px-6 py-6 sm:grid-cols-3 lg:px-8">
              {PASOS_CAMINO.map((n, j) => (
                <li key={n} className="flex gap-3">
                  <span className="cifras flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-bosque/50 text-sm font-bold text-bosque">
                    {j + 1}
                  </span>
                  <p>
                    <strong className="block leading-snug">{t(`inicio.como.${clave}.${n}.fuerte`)}</strong>
                    <span className="text-secundario">{t(`inicio.como.${clave}.${n}.resto`)}</span>
                  </p>
                </li>
              ))}
            </ol>
            <div className="flex items-center px-6 pb-6 lg:px-7 lg:pb-0">
              <Link href={ruta(accion.href)} className={buttonClass(accion.variante, "w-full lg:w-auto")}>
                {t(accion.texto)}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>

      <section aria-labelledby="preguntas" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Reveal as="h3" variant="sube" id="preguntas" className="text-4xl">
          {t("inicio.preguntas.titulo")}
        </Reveal>
        <div className="divide-y divide-arena/70 border-y border-arena/70">
          {PREGUNTAS.map((id, i) => (
            <Reveal as="details" variant="sube" delay={i} key={id} id={id} className="group/p scroll-mt-28">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold transition-colors hover:text-bosque [&::-webkit-details-marker]:hidden">
                {t(`inicio.preguntas.${id}.pregunta`)}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-bosque/40 text-bosque transition-transform duration-300 ease-(--ease-spring) group-open/p:rotate-45 group-hover/p:border-bosque">
                  <IconoMas className="h-4 w-4" />
                </span>
              </summary>
              <p className="max-w-prose pb-6 text-lg text-secundario">{t(`inicio.preguntas.${id}.respuesta`)}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </section>
  );
}
