import { getSession, homeFor } from "@/app/_lib/session";
import { getT } from "@/i18n/servidor";
import { SiteNav } from "./SiteNav";

/** Menú superior, igual en todas las páginas públicas. Con sesión muestra «Mi perfil» o «Mi portal». */
export async function SiteHeader() {
  const [session, { t, ruta }] = await Promise.all([getSession(), getT()]);
  const account = session
    ? {
        label:
          session.role === "ong"
            ? t("comun.nav.miPortal")
            : session.role === "admin"
              ? t("comun.nav.administrador")
              : t("comun.nav.miPerfil"),
        href: ruta(homeFor(session)),
        profileHref: session.role === "persona" ? ruta("/perfil") : null,
      }
    : null;
  return <SiteNav account={account} />;
}
