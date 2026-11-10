import Link from "next/link";
import { getSession, homeFor } from "@/app/_lib/session";
import { buttonClass, TestnetBadge } from "@/components/ui";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";

/** Menú superior, igual en todas las páginas públicas. Con sesión muestra «Mi perfil» o «Mi portal». */
export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-arena/60 bg-crema">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8"
      >
        <Logo />
        <NavLinks />
        <div className="flex items-center gap-4">
          <TestnetBadge />
          {session ? (
            <Link href={homeFor(session)} className={buttonClass("primario", "py-2")}>
              <span aria-hidden className="h-2 w-2 rounded-full bg-salvia" />
              {session.role === "ong" ? "Mi portal" : "Mi perfil"}
            </Link>
          ) : (
            <>
              <Link href="/ingresar?modo=ingresar" className="font-medium text-bosque underline underline-offset-2">
                Ingresar
              </Link>
              <Link href="/ingresar" className={buttonClass("primario", "py-2")}>
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
