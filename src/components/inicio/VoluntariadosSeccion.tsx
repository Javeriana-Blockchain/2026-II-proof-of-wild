import Image from "next/image";
import Link from "next/link";
import { IconoCamara, IconoCheck } from "@/components/iconos";
import { ContourField } from "@/components/mapa/ContourField";
import { buttonClass, EmptyState, ProgressBar } from "@/components/ui";
import type { PublicVolunteering } from "@/platform/db/repositories/volunteering";
import { Reveal } from "@/components/movimiento/Reveal";
import { getT } from "@/i18n/servidor";

/** Reglas de la jornada y pasos del voluntariado: cada uno es una frase en negrita y su continuación. */
const REGLAS = ["regla1", "regla2", "regla3"] as const;
const PASOS = ["como.1", "como.2", "como.3"] as const;

/** «Voluntariados»: las jornadas abiertas de las ONG, con la regla de no tener contacto con los animales. */
export async function VoluntariadosSeccion({ list }: { list: PublicVolunteering[] }) {
  const { t, rich, ruta, formatDate, formatDayMonth } = await getT();
  const thisYear = new Date().getUTCFullYear();
  return (
    <section id="voluntariados" aria-labelledby="titulo-voluntariados" className="relative isolate overflow-hidden bg-profundo text-white">
      <ContourField variant="noche" seed={11} className="absolute inset-0 -z-10 h-full w-full" />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-20 sm:px-8">
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-2xl">
            <Reveal as="h2" variant="sube" id="titulo-voluntariados" className="text-5xl sm:text-6xl">
              {t("inicio.vol.titulo")}
            </Reveal>
            <Reveal as="p" variant="sube" delay={1} className="mt-4 text-xl text-white/90">
              {t("inicio.vol.intro")}
            </Reveal>
          </div>
          <ul className="flex flex-wrap gap-3">
            {REGLAS.map((regla, i) => (
              <Reveal as="li" variant="pop" delay={1 + i}
                key={regla}
                className="rounded-2xl border border-white/25 bg-profundo px-5 py-3"
              >
                <strong className="block">{t(`inicio.vol.${regla}.fuerte`)}</strong>
                <span className="text-white/80">{t(`inicio.vol.${regla}.resto`)}</span>
              </Reveal>
            ))}
          </ul>
        </header>

        <div className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Reveal as="h3" variant="sube" className="text-4xl">
              {t("inicio.vol.proximas")}
            </Reveal>
            <p className="text-white/80">{t("inicio.vol.sinAnimales")}</p>
          </div>

          {list.length === 0 ? (
            <EmptyState tone="oscuro" title={t("inicio.vol.vacio.titulo")}>
              {t("inicio.vol.vacio.texto")}
            </EmptyState>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {list.map((v, i) => {
                const free = v.capacity - v.occupied;
                const date =
                  new Date(`${v.date}T00:00:00Z`).getUTCFullYear() > thisYear ? formatDate(v.date) : formatDayMonth(v.date);
                return (
                  <Reveal as="article" variant="pop" delay={i}
                    key={v.id}
                    className="group/jornada grid overflow-hidden rounded-[28px] bg-white text-texto transition-[transform,box-shadow,--tw-ring-color] duration-300 ease-(--ease-spring) hover:-translate-y-1 sm:grid-cols-[2fr_3fr]"
                  >
                    <div className="relative min-h-56 overflow-hidden bg-salvia">
                      {v.photoPath ? (
                        <Image
                          src={v.photoPath}
                          alt={t("inicio.vol.fotoAlt", { ong: v.ngo.name })}
                          fill
                          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 100vw"
                          className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/jornada:scale-[1.05]"
                        />
                      ) : (
                        <span className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm">
                          <IconoCamara className="h-7 w-7" /> {t("inicio.vol.sinFoto")}
                        </span>
                      )}
                      <span className="rotulo absolute top-4 left-4 rounded-md bg-bosque px-2.5 py-1.5 text-white">{date}</span>
                    </div>
                    <div className="flex flex-col gap-3 p-6">
                      <h4 className="font-display text-3xl font-semibold">{v.ngo.name}</h4>
                      <p className="text-secundario">
                        {v.title} · {v.schedule} · {v.city}
                      </p>
                      <ul className="space-y-1">
                        {v.tasks.map((tarea) => (
                          <li key={tarea} className="flex gap-2">
                            <IconoCheck className="mt-1 h-4 w-4 shrink-0 text-bosque" /> {tarea}
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm">
                        <strong>{t("inicio.vol.requisitos")}</strong> {v.requirements.join(" · ").toLowerCase()}
                      </p>
                      <div className="mt-auto space-y-1 pt-2">
                        <p className="cifras flex justify-between text-sm">
                          <span>
                            {rich("inicio.vol.ocupados", { b: (s) => <strong>{s}</strong> }, { ocupados: v.occupied, cupos: v.capacity })}
                          </span>
                          <span className="text-secundario">{t("inicio.vol.quedan", { n: free })}</span>
                        </p>
                        <ProgressBar percent={(v.occupied / v.capacity) * 100} label={t("inicio.vol.barra")} />
                      </div>
                      <div className="flex flex-wrap items-center gap-5 pt-2">
                        {free > 0 ? (
                          <Link href={ruta(`/?inscribirme=${v.id}`)} scroll={false} className={buttonClass("primario")}>
                            {t("inicio.vol.inscribirme")}
                          </Link>
                        ) : (
                          <span className={buttonClass("primario", "pointer-events-none opacity-60")}>{t("inicio.vol.sinCupos")}</span>
                        )}
                        <Link href={ruta(`/ong/${v.ngo.slug}`)} className="enlace">
                          {t("inicio.vol.verOng")}
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>

        <Reveal as="section" variant="capa"
          aria-labelledby="como-voluntariado"
          className="grid items-center gap-6 rounded-[28px] bg-arena p-7 text-texto lg:grid-cols-[1fr_3fr]"
        >
          <h3 id="como-voluntariado" className="text-3xl">
            {t("inicio.vol.como.titulo")}
          </h3>
          <ol className="grid gap-5 sm:grid-cols-3">
            {PASOS.map((paso, i) => (
              <li key={paso} className="flex gap-3">
                <span className="cifras flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bosque font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <strong className="block">{t(`inicio.vol.${paso}.fuerte`)}</strong>
                  {t(`inicio.vol.${paso}.resto`)}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
