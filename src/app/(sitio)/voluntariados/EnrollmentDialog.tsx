"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { formatDayMonth } from "@/app/_lib/format";
import { IconoCheck, IconoMenu } from "@/components/iconos";
import { buttonClass } from "@/components/ui";
import type { PublicVolunteering } from "@/platform/db/repositories/volunteering";
import { submitEnrollment } from "./actions";

const field =
  "mt-1 w-full rounded-xl border-2 border-arena bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-bosque/50 focus:border-bosque focus:ring-4 focus:ring-salvia/45";

const AVAILABILITY = [
  ["toda_la_jornada", "Toda la jornada"],
  ["manana", "Solo en la mañana"],
  ["tarde", "Solo en la tarde"],
] as const;

/** Ventana D: inscripción a un voluntariado y su confirmación. */
export function EnrollmentDialog({
  volunteering: v,
  defaults,
  signedIn,
}: {
  volunteering: PublicVolunteering;
  defaults: { fullName: string; email: string; phone: string };
  signedIn: boolean;
}) {
  const router = useRouter();
  const [availability, setAvailability] = useState<(typeof AVAILABILITY)[number][0]>("toda_la_jornada");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const close = () => router.push("/", { scroll: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.push("/", { scroll: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const result = await submitEnrollment({
      volunteeringId: v.id,
      fullName: String(f.get("fullName") ?? ""),
      email: String(f.get("email") ?? ""),
      phone: String(f.get("phone") ?? ""),
      availability,
      consent: f.get("consent") !== null,
    });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setDone(true);
    router.refresh();
  }

  const free = v.capacity - v.occupied;

  return (
    <div className="anim-fondo fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-inscripcion"
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[92vh] w-full max-w-5xl anim-ventana overflow-auto rounded-[28px] bg-white shadow-2xl md:grid-cols-[1fr_1.6fr]"
      >
        <aside className="space-y-4 bg-profundo p-8 text-white">
          <span className="inline-block rounded-full bg-arena px-3 py-1 text-sm font-semibold text-texto">Voluntariado</span>
          <h2 className="text-4xl">{v.ngo.name}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
            <dt className="text-arena">Fecha</dt>
            <dd>{formatDayMonth(v.date)}</dd>
            <dt className="text-arena">Horario</dt>
            <dd>{v.schedule}</dd>
            <dt className="text-arena">Lugar</dt>
            <dd>{v.city} · la dirección llega por correo</dd>
            <dt className="text-arena">Cupos</dt>
            <dd>Quedan {free}</dd>
          </dl>
          <p className="rounded-2xl border border-white/25 bg-white/10 p-4 text-sm">
            <strong>Sin contacto con los animales.</strong> Las tareas se hacen en zonas donde no están, para no
            estresarlos ni acostumbrarlos a las personas.
          </p>
        </aside>

        <section className="space-y-5 p-8">
          <div className="flex items-start justify-between gap-4">
            <h3 id="titulo-inscripcion" className="text-4xl">
              Inscripción
            </h3>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="mov-hover flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-arena text-texto transition-[transform,border-color,color] duration-200 ease-(--ease-spring) hover:rotate-90 hover:border-bosque hover:text-bosque disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconoMenu abierto className="h-5 w-5" />
            </button>
          </div>

          {done ? (
            <div className="space-y-5">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-salvia text-profundo">
                <IconoCheck className="h-7 w-7" />
              </span>
              <h4 className="font-serif text-4xl">¡Listo, tu inscripción quedó enviada!</h4>
              <p className="text-lg">
                {v.ngo.name} te escribirá para confirmar tu cupo y darte la dirección.
                {signedIn ? " Ya aparece en tu perfil." : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                {signedIn ? (
                  <Link href="/perfil" className={buttonClass("primario")}>
                    Ir a mi perfil
                  </Link>
                ) : null}
                <button type="button" onClick={close} className={buttonClass("secundario")}>
                  Ver más voluntariados
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <label className="block">
                <span className="font-semibold">Nombre completo</span>
                <input name="fullName" defaultValue={defaults.fullName} required autoComplete="name" className={field} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-semibold">Correo</span>
                  <input name="email" type="email" defaultValue={defaults.email} required autoComplete="email" className={field} />
                </label>
                <label className="block">
                  <span className="font-semibold">Teléfono</span>
                  <input name="phone" defaultValue={defaults.phone} required autoComplete="tel" className={field} />
                </label>
              </div>
              <fieldset>
                <legend className="font-semibold">Disponibilidad ese día</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AVAILABILITY.map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 ${availability === value ? "border-bosque bg-crema font-semibold" : "border-arena"}`}
                    >
                      <input
                        type="radio"
                        name="availability"
                        value={value}
                        checked={availability === value}
                        onChange={() => setAvailability(value)}
                        className="accent-bosque"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {signedIn ? null : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gris p-4 text-sm">
                  <p>
                    <strong>¿Tienes cuenta?</strong> Si ingresas, llenamos estos datos por ti y la inscripción aparece en
                    tu perfil y en tu Huella verificada.
                  </p>
                  <Link
                    href={`/ingresar?modo=ingresar&volver=${encodeURIComponent(`/?inscribirme=${v.id}`)}`}
                    className={buttonClass("secundario", "py-2")}
                  >
                    Ingresar
                  </Link>
                </div>
              )}
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 accent-bosque" />
                <span>Autorizo el uso de mis datos para gestionar esta inscripción (Ley 1581 de 2012). Solo la ONG los ve.</span>
              </label>
              {error ? (
                <p role="alert" className="rounded-xl border border-error bg-error/5 px-4 py-3 text-sm font-medium text-error">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-arena/60 pt-4">
                <p className="text-sm text-secundario">La ONG te escribirá para confirmar tu cupo.</p>
                <button type="submit" disabled={busy || free <= 0} className={buttonClass("primario", "px-7 py-3")}>
                  {busy ? "Enviando…" : "Enviar inscripción"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
