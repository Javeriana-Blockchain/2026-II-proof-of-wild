import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/app/_lib/session";
import { IconoCheck } from "@/components/iconos";
import { Logo } from "@/components/sitio/Logo";
import { TestnetBadge } from "@/components/ui";
import { AccountForms } from "./AccountForms";

export const metadata: Metadata = { title: "Crear cuenta o ingresar" };

type Props = { searchParams: Promise<{ modo?: string; tipo?: string; volver?: string }> };

const LINEAS = [
  ["Donantes:", "ven en qué se usa cada aporte."],
  ["Voluntarios:", "se inscriben a jornadas en las ONG."],
  ["ONG:", "publican sus casos y rinden cuentas."],
];

/** Cuenta 1: crear cuenta (persona u ONG) o ingresar. Todos entran con correo y contraseña. */
export default async function IngresarPage({ searchParams }: Props) {
  const { modo, tipo, volver } = await searchParams;
  const session = await getSession();
  if (session) redirect(homeFor(session));

  return (
    <main className="grid min-h-screen lg:grid-cols-[3fr_4fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <Image
          src="/fotos/portada-oso-de-anteojos.webp"
          alt=""
          fill
          priority
          sizes="45vw"
          className="object-cover object-[78%_center]"
        />
        <div className="absolute inset-0 bg-profundo/70" />
        <div className="relative">
          <Logo dark />
        </div>
        <div className="relative space-y-4">
          <h2 className="text-6xl leading-tight">Tu huella empieza aquí</h2>
          <p className="max-w-md text-lg text-white/90">
            Crea tu cuenta una sola vez y úsala para apadrinar casos, inscribirte a voluntariados o mostrar el
            trabajo de tu ONG.
          </p>
        </div>
        <ul className="relative space-y-2">
          {LINEAS.map(([quien, que]) => (
            <li key={quien} className="flex items-center gap-3">
              <IconoCheck className="h-5 w-5 text-salvia" />
              <span>
                <strong>{quien}</strong> {que}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-end gap-4">
          <span className="mr-auto lg:hidden">
            <Logo />
          </span>
          <TestnetBadge />
          <Link href="/" className="font-medium text-bosque underline">
            Volver al inicio
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <AccountForms
            initialMode={modo === "ingresar" ? "ingresar" : "crear"}
            initialRole={tipo === "ong" ? "ong" : "persona"}
            returnTo={volver}
          />
        </div>
      </section>
    </main>
  );
}
