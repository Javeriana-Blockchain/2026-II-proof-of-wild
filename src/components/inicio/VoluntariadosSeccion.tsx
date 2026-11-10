import Image from "next/image";
import Link from "next/link";
import { formatDate, formatDayMonth } from "@/app/_lib/format";
import { IconoCamara, IconoCheck } from "@/components/iconos";
import { ContourField } from "@/components/mapa/ContourField";
import { buttonClass, EmptyState, ProgressBar } from "@/components/ui";
import type { PublicVolunteering } from "@/platform/db/repositories/volunteering";

const REGLAS = [
  ["Sin contacto", "con los animales"],
  ["Cupos limitados", "grupos pequeños"],
  ["La ONG confirma", "tu cupo por correo"],
];

const PASOS = [
  ["Elige una jornada", "y envía tu inscripción."],
  ["La ONG te confirma", "tu cupo y la dirección por correo."],
  ["Vives un día en el refugio", "y ves en persona cómo se usa cada aporte."],
];

/** «Voluntariados»: las jornadas abiertas de las ONG, con la regla de no tener contacto con los animales. */
export function VoluntariadosSeccion({ list }: { list: PublicVolunteering[] }) {
  const thisYear = new Date().getUTCFullYear();
  return (
    <section id="voluntariados" aria-labelledby="titulo-voluntariados" className="relative isolate overflow-hidden bg-profundo text-white">
      <ContourField variant="noche" seed={11} className="absolute inset-0 -z-10 h-full w-full" />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-20 sm:px-8">
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-2xl">
            <h2 id="titulo-voluntariados" data-reveal="sube" className="text-5xl sm:text-6xl">
              Voluntariados
            </h2>
            <p data-reveal="sube" style={{ ["--d" as string]: 1 }} className="mt-4 text-xl text-white/90">
              Pasa un día en una de las ONG de la página y conoce de cerca cómo trabajan. Ayudas con el refugio, no con los
              animales.
            </p>
          </div>
          <ul className="flex flex-wrap gap-3">
            {REGLAS.map(([fuerte, resto], i) => (
              <li
                key={fuerte}
                data-reveal="pop"
                style={{ ["--d" as string]: 1 + i }}
                className="rounded-2xl border border-white/25 bg-profundo px-5 py-3"
              >
                <strong className="block">{fuerte}</strong>
                <span className="text-white/80">{resto}</span>
              </li>
            ))}
          </ul>
        </header>

        <div className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 data-reveal="sube" className="text-4xl">
              Próximas jornadas
            </h3>
            <p className="text-white/80">Las tareas se hacen en zonas sin animales, por su bienestar.</p>
          </div>

          {list.length === 0 ? (
            <EmptyState tone="oscuro" title="Por ahora no hay jornadas abiertas.">
              Cuando una ONG publique una jornada aparecerá aquí, con sus tareas y sus cupos.
            </EmptyState>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {list.map((v, i) => {
                const free = v.capacity - v.occupied;
                const date =
                  new Date(`${v.date}T00:00:00Z`).getUTCFullYear() > thisYear ? formatDate(v.date) : formatDayMonth(v.date);
                return (
                  <article
                    key={v.id}
                    data-reveal="pop"
                    style={{ ["--d" as string]: i }}
                    className="group/jornada grid overflow-hidden rounded-[28px] bg-white text-texto transition-[transform,box-shadow] duration-300 ease-(--ease-spring) hover:-translate-y-1 hover:shadow-[0_26px_50px_-30px_rgb(0_0_0/0.7)] sm:grid-cols-[2fr_3fr]"
                  >
                    <div className="relative min-h-56 overflow-hidden bg-salvia">
                      {v.photoPath ? (
                        <Image
                          src={v.photoPath}
                          alt={`Instalaciones de ${v.ngo.name}`}
                          fill
                          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 100vw"
                          className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/jornada:scale-[1.05]"
                        />
                      ) : (
                        <span className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm">
                          <IconoCamara className="h-7 w-7" /> Foto del refugio (sin animales cerca)
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
                        {v.tasks.map((t) => (
                          <li key={t} className="flex gap-2">
                            <IconoCheck className="mt-1 h-4 w-4 shrink-0 text-bosque" /> {t}
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm">
                        <strong>Requisitos:</strong> {v.requirements.join(" · ").toLowerCase()}
                      </p>
                      <div className="mt-auto space-y-1 pt-2">
                        <p className="cifras flex justify-between text-sm">
                          <span>
                            <strong>{v.occupied}</strong> de {v.capacity} cupos ocupados
                          </span>
                          <span className="text-secundario">Quedan {free}</span>
                        </p>
                        <ProgressBar percent={(v.occupied / v.capacity) * 100} label="Cupos ocupados" />
                      </div>
                      <div className="flex flex-wrap items-center gap-5 pt-2">
                        {free > 0 ? (
                          <Link href={`/?inscribirme=${v.id}`} scroll={false} className={buttonClass("primario")}>
                            Inscribirme
                          </Link>
                        ) : (
                          <span className={buttonClass("primario", "pointer-events-none opacity-60")}>Sin cupos</span>
                        )}
                        <Link href={`/ong/${v.ngo.slug}`} className="enlace">
                          Ver la ONG
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <section
          aria-labelledby="como-voluntariado"
          data-reveal="capa"
          className="grid items-center gap-6 rounded-[28px] bg-arena p-7 text-texto lg:grid-cols-[1fr_3fr]"
        >
          <h3 id="como-voluntariado" className="text-3xl">
            ¿Cómo funciona un voluntariado?
          </h3>
          <ol className="grid gap-5 sm:grid-cols-3">
            {PASOS.map(([fuerte, resto], i) => (
              <li key={fuerte} className="flex gap-3">
                <span className="cifras flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bosque font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <strong className="block">{fuerte}</strong>
                  {resto}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
