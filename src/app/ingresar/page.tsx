import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/app/_lib/session";
import { IconoCheck } from "@/components/iconos";
import { Logo } from "@/components/sitio/Logo";
import { TestnetBadge } from "@/components/ui";
import { getCatalogService } from "@/platform/container";
import { AccountForms } from "./AccountForms";

export const metadata: Metadata = { title: "Crear cuenta o ingresar" };

type Props = { searchParams: Promise<{ modo?: string; tipo?: string; volver?: string }> };

const LINEAS = [
  ["Donantes:", "ven en qué se usa cada aporte."],
  ["Voluntarios:", "se inscriben a jornadas en las ONG."],
  ["ONG:", "publican sus casos y rinden cuentas."],
];

/** Si la persona llega desde «Apadrinar», el caso que eligió: así la página le muestra a quién va a apadrinar. */
async function sponsoredCase(volver: string | undefined) {
  const code = volver?.match(/^\/casos\/(POW_\d{3,6})\?(?:.*&)?apadrinar=1/)?.[1];
  if (!code) return null;
  const detail = await getCatalogService().caseDetail(code);
  return detail ? { name: detail.commonName ?? "este caso", photoUrl: detail.photoUrl } : null;
}

/** Cuenta 1: crear cuenta (persona u ONG) o ingresar. Todos entran con correo y contraseña. */
export default async function IngresarPage({ searchParams }: Props) {
  const { modo, tipo, volver } = await searchParams;
  const session = await getSession();
  // Con la sesión ya iniciada no hay nada que hacer aquí: vuelve a donde iba (si es una ruta interna) o a su inicio.
  if (session) redirect(volver?.startsWith("/") && !volver.startsWith("//") ? volver : homeFor(session));
  const caso = await sponsoredCase(volver);

  return (
    <main className="grid min-h-screen lg:grid-cols-[3fr_4fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <Image
          src={caso?.photoUrl ?? "/fotos/portada-oso-de-anteojos.webp"}
          alt=""
          fill
          priority
          sizes="45vw"
          className={`object-cover ${caso ? "object-center" : "object-[78%_center]"}`}
        />
        <div className="absolute inset-0 bg-profundo/70" />
        <div className="relative">
          <Logo dark />
        </div>
        {caso ? (
          <>
            <div className="relative space-y-4">
              <h2 className="text-5xl leading-tight xl:text-6xl">Estás a un paso de apadrinar a {caso.name}</h2>
              <p className="max-w-md text-lg text-white/90">
                Crea tu cuenta o ingresa, y volverás al caso con la ventana para apadrinar abierta.
              </p>
            </div>
            <ol className="relative space-y-3">
              {[`Elegiste a ${caso.name}`, "Crea tu cuenta o ingresa", "Conecta tu billetera y apadrina"].map((paso, i) => (
                <li key={paso} className="flex items-center gap-3">
                  <span
                    className={`cifras flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-salvia text-profundo" : i === 1 ? "bg-crema text-profundo ring-4 ring-crema/30" : "border-2 border-dashed border-white/50"}`}
                  >
                    {i === 0 ? <IconoCheck className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={i === 1 ? "font-semibold" : "text-white/85"}>{paso}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
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
          </>
        )}
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
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10">
          {caso ? (
            <div className="flex w-full max-w-xl items-center gap-4 rounded-[20px] bg-profundo p-4 text-white lg:hidden">
              {caso.photoUrl ? (
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px]">
                  <Image src={caso.photoUrl} alt="" fill sizes="64px" className="object-cover" />
                </span>
              ) : null}
              <p>
                <strong className="block">Estás a un paso de apadrinar a {caso.name}</strong>
                <span className="text-sm text-white/85">Al terminar vuelves al caso para apadrinar.</span>
              </p>
            </div>
          ) : null}
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
