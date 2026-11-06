import type { Metadata } from "next";
import { login } from "./actions";

export const metadata: Metadata = { title: "Ingresar al portal" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Portal de centros</h1>
      <form action={login} className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium">Correo</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            Correo o contraseña incorrectos.
          </p>
        ) : null}
        <button type="submit" className="rounded-lg bg-[var(--color-acento)] px-5 py-2 font-medium text-white">
          Ingresar
        </button>
      </form>
    </main>
  );
}
