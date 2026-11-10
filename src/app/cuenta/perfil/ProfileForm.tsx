"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { IconoCheck, IconoHuella } from "@/components/iconos";
import { buttonClass } from "@/components/ui";
import { saveProfile, type ProfileInput } from "./actions";

const field = "mt-1 w-full rounded-xl border border-arena bg-white px-4 py-3 outline-none focus:border-bosque";

const INTERESES = [
  ["aves", "Aves"],
  ["mamiferos", "Mamíferos"],
  ["reptiles", "Reptiles"],
] as const;

type Interest = (typeof INTERESES)[number][0];

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold transition ${on ? "bg-bosque text-white" : "border border-arena bg-white"}`}
    >
      {on ? <IconoCheck /> : null}
      {children}
    </button>
  );
}

/** Cuenta 2: terminar el perfil de una persona, con la vista previa «Así te verán». */
export function ProfileForm({ email, initial }: { email: string; initial: ProfileInput }) {
  const router = useRouter();
  const [data, setData] = useState<ProfileInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => setData((d) => ({ ...d, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await saveProfile(data);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    router.push("/perfil");
    router.refresh();
  }

  // Sin suponer el género de la persona: «Voluntariado» en vez de «Voluntaria» o «Voluntario».
  const roles = [data.wantsToDonate ? "Donante" : null, data.wantsToVolunteer ? "Voluntariado" : null, data.city || null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2.5fr]">
      <aside className="space-y-6">
        <ol className="space-y-5 rounded-3xl bg-white p-7">
          <li className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
              <IconoCheck />
            </span>
            <span>
              <strong className="block">Cuenta creada</strong>
              <span className="text-secundario">{email}</span>
            </span>
          </li>
          <li className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-bosque font-semibold text-bosque">
              2
            </span>
            <span>
              <strong className="block text-bosque">Tu perfil</strong>
              <span className="text-secundario">Lo que ven los demás y lo que te interesa</span>
            </span>
          </li>
          <li className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-arena bg-crema font-semibold">
              3
            </span>
            <span>
              <strong className="block">Billetera de Stellar</strong>
              <span className="text-secundario">Para aportar. Puedes conectarla después.</span>
            </span>
          </li>
        </ol>

        <div className="flex flex-col items-center gap-2 rounded-3xl bg-profundo p-8 text-center text-white">
          <p className="font-semibold text-arena">Así te verán</p>
          <span className="mt-2 flex h-24 w-24 items-center justify-center rounded-full bg-arena font-serif text-4xl text-texto">
            {(data.alias || "?").trim().charAt(0).toUpperCase()}
          </span>
          <p className="font-serif text-3xl">{data.alias || "Tu alias"}</p>
          <p className="text-white/85">{roles || "Elige cómo quieres participar"}</p>
          <div className="mt-8 flex w-full items-center gap-4 rounded-2xl border border-dashed border-white/40 p-4 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <IconoHuella className="h-5 w-5" />
            </span>
            <span>
              <strong className="block">Huella verificada</strong>
              <span className="text-sm text-white/80">Se activa con tu primer aporte o voluntariado.</span>
            </span>
          </div>
        </div>
      </aside>

      <form onSubmit={onSubmit} className="space-y-6 rounded-3xl bg-white p-8 sm:p-10" noValidate>
        <header>
          <h1 className="text-5xl">Termina de crear tu perfil</h1>
          <p className="mt-2 text-secundario">Tu correo y tu teléfono nunca se muestran en la página.</p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="font-semibold">Nombre completo (privado)</span>
            <input value={data.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" className={field} />
          </label>
          <label className="block">
            <span className="font-semibold">Alias público</span>
            <input value={data.alias} onChange={(e) => set("alias", e.target.value)} className={field} />
            <span className="mt-1 block text-sm text-secundario">Es lo que ven los demás en los aportes y en tu insignia.</span>
          </label>
          <label className="block">
            <span className="font-semibold">Ciudad</span>
            <input value={data.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" className={field} />
          </label>
          <label className="block">
            <span className="font-semibold">Teléfono (opcional)</span>
            <input
              value={data.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+57 …"
              autoComplete="tel"
              className={field}
            />
            <span className="mt-1 block text-sm text-secundario">Solo lo ve la ONG si te inscribes a un voluntariado.</span>
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 font-semibold">¿Cómo quieres participar?</legend>
            <div className="flex flex-wrap gap-2">
              <Toggle on={data.wantsToDonate} onClick={() => set("wantsToDonate", !data.wantsToDonate)}>
                Donar
              </Toggle>
              <Toggle on={data.wantsToVolunteer} onClick={() => set("wantsToVolunteer", !data.wantsToVolunteer)}>
                Ser voluntario
              </Toggle>
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">Animales que te interesan (opcional)</legend>
            <div className="flex flex-wrap gap-2">
              {INTERESES.map(([value, label]) => {
                const on = data.interests.includes(value);
                return (
                  <Toggle
                    key={value}
                    on={on}
                    onClick={() =>
                      set("interests", on ? data.interests.filter((i) => i !== value) : [...data.interests, value as Interest])
                    }
                  >
                    {label}
                  </Toggle>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="rounded-2xl bg-gris p-5">
          <p className="font-semibold">Billetera de Stellar</p>
          <p className="text-secundario">
            La necesitas para aportar: con ella firmas cada aporte. Puedes conectarla cuando vayas a apadrinar.
          </p>
        </div>

        <div className="space-y-3">
          {(
            [
              ["showAlias", "Mostrar mi alias en los aportes. Si no, sale tu dirección de Stellar abreviada."],
              ["emailUpdates", "Recibir por correo las novedades de los casos que apoyo."],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={data[key]}
                onChange={(e) => set(key, e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-bosque"
              />
              <span>{label}</span>
            </label>
          ))}
          <p className="flex items-start gap-3 text-secundario">
            <IconoCheck className="mt-0.5 h-5 w-5 text-bosque" /> Autorizaste el tratamiento de tus datos (Ley 1581 de
            2012) al crear tu cuenta.
          </p>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-error bg-error/5 px-4 py-3 text-sm font-medium text-error">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-6 border-t border-arena/60 pt-6">
          <Link href="/#casos" className="font-medium text-bosque underline">
            Lo completo después
          </Link>
          <button type="submit" disabled={busy} className={buttonClass("primario", "px-8 py-3 text-lg")}>
            {busy ? "Guardando…" : "Guardar y ver mi perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}
