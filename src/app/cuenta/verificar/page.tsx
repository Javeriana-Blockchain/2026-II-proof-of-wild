import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/app/_lib/session";
import { IdentitySummary, VerificacionIdentidad } from "@/components/identidad/VerificacionIdentidad";
import { ContourField } from "@/components/mapa/ContourField";
import { Logo } from "@/components/sitio/Logo";
import { SelectorIdioma } from "@/components/sitio/SelectorIdioma";
import { buttonClass, TestnetBadge } from "@/components/ui";
import { getT } from "@/i18n/servidor";
import { UNVERIFIED_LIMIT } from "@/modules/identity";
import { getIdentityService } from "@/platform/container";
import { removeIdentity } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("cuenta.verificar.titulo") };
}
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ volver?: string }> };

/** Solo rutas internas: evita usar la página para mandar a la persona a otro sitio. */
function internalPath(value: string | undefined): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

/** Cuenta 3: verificación de identidad, nivel 2 (ADR-21). Opcional hasta el límite; obligatoria para aportes grandes. */
export default async function VerificarPage({ searchParams }: Props) {
  const session = await requireSession("/cuenta/verificar", "persona");
  const { t, ruta } = await getT();
  const volver = internalPath((await searchParams).volver);
  const current = await getIdentityService().status(session.userId);
  const volverLabel = volver?.includes("apadrinar=1") ? t("cuenta.verificar.volverApadrinar") : t("cuenta.verificar.continuar");

  return (
    <>
      <header className="border-b border-arena/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-4">
            <SelectorIdioma />
            <span className="hidden sm:contents">
              <TestnetBadge />
            </span>
            <Link href={ruta("/perfil")} className="enlace hidden sm:inline">
              {t("comun.nav.miPerfil")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8">
        <section className="relative isolate overflow-hidden rounded-[32px] bg-profundo px-7 py-9 text-white sm:px-10">
          <ContourField variant="noche" seed={41} className="absolute inset-0 -z-10 h-full w-full" />
          <p className="rotulo text-arena">{t("cuenta.verificar.nivel")}</p>
          <h1 className="mt-2 text-5xl font-bold sm:text-6xl">{t("cuenta.verificar.titulo")}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">{t("cuenta.verificar.texto", { limite: UNVERIFIED_LIMIT })}</p>
        </section>

        {current ? (
          <section className="anim-ventana mx-auto max-w-2xl space-y-5 rounded-[28px] bg-white p-7 ring-1 ring-arena/70 sm:p-9">
            <h2 className="text-4xl">{t("cuenta.verificar.yaVerificaste")}</h2>
            <IdentitySummary
              identity={{
                documentLast4: current.documentLast4,
                method: current.method,
                faceMatch: current.faceMatch,
                provider: current.provider,
                providerReference: current.providerReference,
                verifiedAt: current.verifiedAt.toISOString(),
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              {volver ? (
                <Link href={ruta(volver)} className={buttonClass("primario", "py-3.5")}>
                  {volverLabel}
                </Link>
              ) : null}
              <Link href={ruta("/perfil")} className={buttonClass(volver ? "secundario" : "primario", "py-3.5")}>
                {t("cuenta.verificar.irPerfil")}
              </Link>
              <form action={removeIdentity}>
                <button type="submit" className="enlace text-sm text-error">
                  {t("cuenta.verificar.borrar")}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <VerificacionIdentidad volver={volver} volverLabel={volverLabel} />
        )}
      </main>
    </>
  );
}
