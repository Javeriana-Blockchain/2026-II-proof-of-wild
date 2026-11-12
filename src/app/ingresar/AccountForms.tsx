"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui";
import { signIn, signUp } from "./srp-client";

type Mode = "crear" | "ingresar";
type Role = "persona" | "ong";

const field =
  "mt-1 w-full rounded-xl border-2 border-arena bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-bosque/50 focus:border-bosque focus:ring-4 focus:ring-salvia/45";

/** Pantalla «Cuenta 1»: una tarjeta con dos pestañas, Crear cuenta e Ingresar. */
export function AccountForms({ initialMode, initialRole, returnTo }: { initialMode: Mode; initialRole: Role; returnTo?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (mode === "crear") {
      if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
      if (password !== String(form.get("password2") ?? "")) return setError("Las contraseñas no coinciden.");
      if (!form.get("consent")) return setError("Acepta los términos y el tratamiento de datos para continuar.");
    }

    setBusy(true);
    const result =
      mode === "crear" ? await signUp(email, password, role, returnTo) : await signIn(email, password, returnTo);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    router.push(result.data.redirectTo);
    router.refresh();
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => {
        setMode(value);
        setError(null);
      }}
      className={`flex-1 rounded-full py-3 font-semibold transition ${mode === value ? "bg-bosque text-white" : "text-texto"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-lg sm:p-10">
      <div role="tablist" className="mb-6 flex rounded-full bg-crema p-1.5">
        {tab("crear", "Crear cuenta")}
        {tab("ingresar", "Ingresar")}
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <h1 className="text-4xl">{mode === "crear" ? "Crea tu cuenta" : "Hola de nuevo"}</h1>

        {mode === "crear" ? (
          <fieldset>
            <legend className="mb-2 font-semibold">¿Cómo vas a participar?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["persona", "Como persona", "Dona, sé voluntario o las dos"],
                  ["ong", "Como ONG", "Muestra tus casos y recibe aportes"],
                ] as const
              ).map(([value, title, text]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition ${role === value ? "border-bosque bg-crema" : "border-arena"}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                    className="sr-only"
                  />
                  <span className="block font-semibold">{title}</span>
                  <span className="text-sm text-secundario">{text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <label className="block">
          <span className="font-semibold">Correo</span>
          <input name="email" type="email" required autoComplete="email" placeholder="tu@correo.com" className={field} />
        </label>

        <div className={mode === "crear" ? "grid gap-3 sm:grid-cols-2" : ""}>
          <label className="block">
            <span className="font-semibold">Contraseña</span>
            <input
              name="password"
              type="password"
              required
              minLength={mode === "crear" ? 8 : undefined}
              autoComplete={mode === "crear" ? "new-password" : "current-password"}
              className={field}
            />
          </label>
          {mode === "crear" ? (
            <label className="block">
              <span className="font-semibold">Repite la contraseña</span>
              <input name="password2" type="password" required autoComplete="new-password" className={field} />
            </label>
          ) : null}
        </div>
        {mode === "crear" ? <p className="-mt-3 text-sm text-secundario">Mínimo 8 caracteres</p> : null}

        {mode === "crear" ? (
          <label className="flex gap-3 text-sm">
            <input name="consent" type="checkbox" className="mt-0.5 h-5 w-5 accent-bosque" />
            <span>Acepto los términos y autorizo el tratamiento de mis datos (Ley 1581 de 2012).</span>
          </label>
        ) : (
          <p className="text-sm">
            <Link href="/#cuenta" className="font-medium text-bosque underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        )}

        {error ? (
          <p role="alert" className="rounded-xl border border-error bg-error/5 px-4 py-3 text-sm font-medium text-error">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={buttonClass("primario", "w-full py-3.5 text-lg")}>
          {busy ? "Un momento…" : mode === "crear" ? "Crear cuenta" : "Ingresar"}
        </button>

        <p className="text-sm text-secundario">
          {mode === "crear"
            ? "Después terminas tu perfil. La billetera de Stellar la conectas cuando vayas a aportar."
            : "Las personas llegan a su perfil y las ONG a su portal. La billetera de Stellar se conecta después, cuando vayas a aportar o a registrar un gasto."}
        </p>
      </form>
    </div>
  );
}
