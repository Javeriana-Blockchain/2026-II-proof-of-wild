import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/app/_lib/session";
import { IconoCheck } from "@/components/iconos";
import { buttonClass } from "@/components/ui";
import { getT, redirigir } from "@/i18n/servidor";
import { NgoForm } from "./NgoForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("ong.registro.meta.titulo") };
}
export const dynamic = "force-dynamic";

/**
 * Registro de ONG (pantalla 7): paso 2 de la cuenta de una ONG. Se llega desde «Soy ONG y quiero aparecer»;
 * sin cuenta, primero se crea una como ONG.
 */
export default async function RegistroOngPage() {
  const session = await getSession();
  if (!session) return redirigir("/ingresar?tipo=ong&volver=/ong/registro");
  const { t, ruta } = await getT();

  const ganas = [
    t("ong.registro.ganas.visibilidad"),
    t("ong.registro.ganas.credibilidad"),
    t("ong.registro.ganas.aportes"),
  ];

  let contenido: React.ReactNode;
  if (session.role !== "ong") {
    contenido = <Aviso titulo={t("ong.registro.aviso.persona.titulo")}>{t("ong.registro.aviso.persona.texto")}</Aviso>;
  } else if (session.ngoStatus === "aprobada") {
    contenido = (
      <Aviso
        titulo={t("ong.registro.aviso.publicada.titulo")}
        accion={{ href: ruta("/portal"), texto: t("ong.registro.aviso.publicada.accion") }}
      >
        {t("ong.registro.aviso.publicada.texto")}
      </Aviso>
    );
  } else if (session.ngoStatus) {
    contenido = <Aviso titulo={t("ong.registro.aviso.revision.titulo")}>{t("ong.registro.revisionTexto")}</Aviso>;
  } else {
    contenido = <NgoForm contactEmail={session.email} />;
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_1.6fr]">
      <aside className="space-y-6 self-start rounded-3xl bg-profundo p-9 text-white">
        <h1 className="text-5xl leading-tight">{t("ong.registro.titulo")}</h1>
        <div>
          <h2 className="font-sans text-lg font-semibold">{t("ong.registro.ganas.titulo")}</h2>
          <ul className="mt-3 space-y-3">
            {ganas.map((g) => (
              <li key={g} className="flex gap-3">
                <IconoCheck className="mt-1 h-5 w-5 shrink-0 text-salvia" />
                <span className="text-white/90">{g}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 rounded-2xl border border-white/20 bg-white/10 p-5">
          <h2 className="font-sans text-lg font-semibold">{t("ong.registro.pedimos.titulo")}</h2>
          <p className="text-white/90">{t("ong.registro.pedimos.costo")}</p>
          <p className="text-white/90">{t("ong.registro.pedimos.registrar")}</p>
        </div>
      </aside>

      <section className="space-y-6 rounded-3xl bg-white p-8 sm:p-10">
        <ol className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <li className="flex items-center gap-2 text-bosque">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bosque text-white">
              <IconoCheck />
            </span>
            {t("ong.registro.paso.cuenta")}
          </li>
          <li aria-hidden className="h-px w-8 bg-arena" />
          <li className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bosque text-bosque">2</span>
            {t("ong.registro.paso.datos")}
          </li>
          <li aria-hidden className="h-px w-8 bg-arena" />
          <li className="flex items-center gap-2 text-secundario">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-arena bg-crema">3</span>
            {t("ong.registro.paso.revision")}
          </li>
        </ol>
        <header>
          <h2 className="text-4xl">{t("ong.registro.encabezado")}</h2>
          <p className="mt-1 text-secundario">{t("ong.registro.revisionTexto")}</p>
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
  /** `href` ya va en el idioma de la página. */
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
