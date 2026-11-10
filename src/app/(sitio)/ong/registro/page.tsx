import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/_lib/session";
import { IconoCheck } from "@/components/iconos";
import { buttonClass } from "@/components/ui";
import { NgoForm } from "./NgoForm";

export const metadata: Metadata = { title: "Registro de ONG" };
export const dynamic = "force-dynamic";

const GANAS = [
  "Visibilidad ante donantes que todavía no te conocen.",
  "Credibilidad que cualquiera puede verificar en Stellar.",
  "Aportes atados a casos concretos de tu centro.",
];

/**
 * Registro de ONG (pantalla 7): paso 2 de la cuenta de una ONG. Se llega desde «Soy ONG y quiero aparecer»;
 * sin cuenta, primero se crea una como ONG.
 */
export default async function RegistroOngPage() {
  const session = await getSession();
  if (!session) redirect("/ingresar?tipo=ong&volver=/ong/registro");

  let contenido: React.ReactNode;
  if (session.role !== "ong") {
    contenido = (
      <Aviso titulo="Esta cuenta es de persona">
        Para registrar una ONG, crea una cuenta nueva como ONG con el correo de la organización.
      </Aviso>
    );
  } else if (session.ngoStatus === "aprobada") {
    contenido = (
      <Aviso titulo="Tu ONG ya está publicada" accion={{ href: "/portal", texto: "Ir a mi portal" }}>
        Ya puedes registrar los gastos y los hitos de tus casos.
      </Aviso>
    );
  } else if (session.ngoStatus) {
    contenido = (
      <Aviso titulo="Tu solicitud está en revisión">
        Un administrador revisa los datos y te avisa por correo cuando tu perfil esté publicado.
      </Aviso>
    );
  } else {
    contenido = <NgoForm contactEmail={session.email} />;
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_1.6fr]">
      <aside className="space-y-6 self-start rounded-3xl bg-profundo p-9 text-white">
        <h1 className="text-5xl leading-tight">Muestra el trabajo de tu ONG</h1>
        <div>
          <h2 className="font-sans text-lg font-semibold">Lo que ganas</h2>
          <ul className="mt-3 space-y-3">
            {GANAS.map((g) => (
              <li key={g} className="flex gap-3">
                <IconoCheck className="mt-1 h-5 w-5 shrink-0 text-salvia" />
                <span className="text-white/90">{g}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 rounded-2xl border border-white/20 bg-white/10 p-5">
          <h2 className="font-sans text-lg font-semibold">Lo que te pedimos</h2>
          <p className="text-white/90">Publicar el costo de cada etapa del tratamiento.</p>
          <p className="text-white/90">Registrar cada gasto con su factura y cada avance con su foto.</p>
        </div>
      </aside>

      <section className="space-y-6 rounded-3xl bg-white p-8 sm:p-10">
        <ol className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <li className="flex items-center gap-2 text-bosque">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bosque text-white">
              <IconoCheck />
            </span>
            Cuenta creada
          </li>
          <li aria-hidden className="h-px w-8 bg-arena" />
          <li className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bosque text-bosque">2</span>
            Datos de la ONG
          </li>
          <li aria-hidden className="h-px w-8 bg-arena" />
          <li className="flex items-center gap-2 text-secundario">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-arena bg-crema">3</span>
            Revisión del equipo
          </li>
        </ol>
        <header>
          <h2 className="text-4xl">Termina el perfil de tu ONG</h2>
          <p className="mt-1 text-secundario">
            Un administrador revisa los datos y te avisa por correo cuando tu perfil esté publicado.
          </p>
        </header>
        {contenido}
      </section>
    </main>
  );
}

function Aviso({
  titulo,
  children,
  accion,
}: {
  titulo: string;
  children: React.ReactNode;
  accion?: { href: string; texto: string };
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-crema p-6">
      <h3 className="font-sans text-xl font-semibold">{titulo}</h3>
      <p>{children}</p>
      {accion ? (
        <Link href={accion.href} className={buttonClass("primario")}>
          {accion.texto}
        </Link>
      ) : null}
    </div>
  );
}
