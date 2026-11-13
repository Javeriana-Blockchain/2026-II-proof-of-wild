import type { ReactNode } from "react";
import { logout } from "@/app/ingresar/actions";
import { requireSession } from "@/app/_lib/session";
import { Logo } from "@/components/sitio/Logo";
import { SelectorIdioma } from "@/components/sitio/SelectorIdioma";
import { getT, redirigir } from "@/i18n/servidor";
import { shortAccount } from "@/lib/stellar-account";

export const dynamic = "force-dynamic";

async function salir() {
  "use server";
  await logout();
  await redirigir("/");
}

/** Portal de la ONG (pantalla 9): solo para la cuenta de una ONG aprobada. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await requireSession("/portal", "ong");
  if (!session.ngoId || session.ngoStatus !== "aprobada") return redirigir("/ong/registro");
  const { t } = await getT();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-arena bg-crema">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <Logo testnet />
            <span className="rotulo hidden rounded-md bg-bosque px-2.5 py-1.5 text-white sm:inline-flex">{t("ong.portal.titulo")}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SelectorIdioma />
            <span className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 ring-1 ring-arena">
              <span aria-hidden className="h-2 w-2 shrink-0 animate-brillo rounded-full bg-bosque" />
              <span className="font-semibold whitespace-nowrap">{session.displayName}</span>
              {session.stellarAccount ? (
                <span className="hidden font-mono text-sm text-secundario md:inline">· {shortAccount(session.stellarAccount)}</span>
              ) : null}
            </span>
            <form action={salir}>
              <button
                type="submit"
                className="group/salir relative cursor-pointer py-2 font-semibold whitespace-nowrap text-texto transition-colors hover:text-bosque"
              >
                {t("comun.nav.cerrarSesion")}
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-bosque transition-transform duration-300 ease-(--ease-out-expo) group-hover/salir:scale-x-100"
                />
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
