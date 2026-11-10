import { getSession, homeFor } from "@/app/_lib/session";
import { SiteNav } from "./SiteNav";

/** Menú superior, igual en todas las páginas públicas. Con sesión muestra «Mi perfil» o «Mi portal». */
export async function SiteHeader() {
  const session = await getSession();
  const account = session
    ? {
        label: session.role === "ong" ? "Mi portal" : "Mi perfil",
        href: homeFor(session),
        profileHref: session.role === "persona" ? "/perfil" : null,
      }
    : null;
  return <SiteNav account={account} />;
}
