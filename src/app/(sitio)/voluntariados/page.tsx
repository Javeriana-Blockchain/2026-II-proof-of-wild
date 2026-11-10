import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatDayMonth, formatDate } from "@/app/_lib/format";
import { getSession } from "@/app/_lib/session";
import { IconoCamara, IconoCheck } from "@/components/iconos";
import { buttonClass, ProgressBar } from "@/components/ui";
import { getDb } from "@/platform/db/client";
import { enrollmentDefaults, listVolunteerings } from "@/platform/db/repositories/volunteering";
import { EnrollmentDialog } from "./EnrollmentDialog";

export const metadata: Metadata = { title: "Voluntariados" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ inscribirme?: string }> };

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

/** Pantalla 8: voluntariados de las ONG, con la regla de no tener contacto directo con los animales. */
export default async function VoluntariadosPage({ searchParams }: Props) {
  const [{ inscribirme }, session] = await Promise.all([searchParams, getSession()]);
  const db = getDb();
  const list = await listVolunteerings(db);
  const selected = list.find((v) => v.id === inscribirme);
  const defaults =
    selected && session?.role === "persona"
      ? await enrollmentDefaults(db, session.userId)
      : { fullName: "", email: "", phone: "" };

  return (
    <main>
      <section className="bg-profundo text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-4 py-12 sm:px-8">
          <div className="max-w-2xl">
            <h1 className="text-6xl">Voluntariados</h1>
            <p className="mt-3 text-lg text-white/90">
              Pasa un día en una de las ONG de la página y conoce de cerca cómo trabajan. Ayudas con el refugio, no
              con los animales.
            </p>
          </div>
          <ul className="flex flex-wrap gap-3">
            {REGLAS.map(([fuerte, resto]) => (
              <li key={fuerte} className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3">
                <strong className="block">{fuerte}</strong>
                <span className="text-white/80">{resto}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-4xl">Próximas jornadas</h2>
          <p className="text-secundario">Las tareas se hacen en zonas sin animales, por su bienestar.</p>
        </div>

        {list.length === 0 ? (
          <p className="text-secundario">Por ahora no hay jornadas abiertas.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {list.map((v) => {
              const free = v.capacity - v.occupied;
              return (
                <article key={v.id} className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm sm:grid-cols-[2fr_3fr]">
                  <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-2xl bg-salvia text-center text-sm">
                    {v.photoPath ? (
                      <Image src={v.photoPath} alt={`Instalaciones de ${v.ngo.name}`} fill sizes="300px" className="object-cover" />
                    ) : (
                      <span>
                        <IconoCamara className="mx-auto h-7 w-7" /> Foto del refugio (sin animales cerca)
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-bosque px-3 py-0.5 text-sm font-semibold text-white">
                        {new Date(`${v.date}T00:00:00Z`).getUTCFullYear() > new Date().getUTCFullYear()
                          ? formatDate(v.date)
                          : formatDayMonth(v.date)}
                      </span>
                      <span className="rounded-full bg-arena px-3 py-0.5 text-sm font-semibold">{v.city}</span>
                    </p>
                    <h3 className="text-3xl">{v.ngo.name}</h3>
                    <p className="text-secundario">
                      {v.title} · {v.schedule}
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
                    <div>
                      <p className="flex justify-between text-sm">
                        <span>
                          <strong>{v.occupied}</strong> de {v.capacity} cupos ocupados
                        </span>
                        <span className="text-secundario">Quedan {free}</span>
                      </p>
                      <ProgressBar percent={(v.occupied / v.capacity) * 100} label="Cupos ocupados" className="mt-1" />
                    </div>
                    <div className="flex items-center gap-5 pt-1">
                      {free > 0 ? (
                        <Link href={`/voluntariados?inscribirme=${v.id}`} scroll={false} className={buttonClass("primario")}>
                          Inscribirme
                        </Link>
                      ) : (
                        <span className={buttonClass("primario", "pointer-events-none opacity-60")}>Sin cupos</span>
                      )}
                      <Link href={`/ong/${v.ngo.slug}`} className="font-medium text-bosque underline">
                        Ver la ONG
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <section className="grid items-center gap-6 rounded-3xl bg-arena p-7 lg:grid-cols-[1fr_3fr]">
          <h2 className="text-3xl">¿Cómo funciona un voluntariado?</h2>
          <ol className="grid gap-5 sm:grid-cols-3">
            {PASOS.map(([fuerte, resto], i) => (
              <li key={fuerte} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bosque font-semibold text-white">
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

      {selected ? (
        <EnrollmentDialog volunteering={selected} defaults={defaults} signedIn={session?.role === "persona"} />
      ) : null}
    </main>
  );
}
