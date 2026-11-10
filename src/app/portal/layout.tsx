import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/ingresar/actions";
import { requireSession } from "@/app/_lib/session";
import { Logo } from "@/components/sitio/Logo";
import { TestnetBadge } from "@/components/ui";
import { shortAccount } from "@/lib/stellar-account";

export const dynamic = "force-dynamic";

async function salir() {
  "use server";
  await logout();
  redirect("/");
}

/** Portal de la ONG (pantalla 9): solo para la cuenta de una ONG aprobada. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await requireSession("/portal", "ong");
  if (!session.ngoId || session.ngoStatus !== "aprobada") redirect("/ong/registro");

  return (
    <>
      <header className="border-b border-arena/60 bg-crema">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="rounded-full bg-bosque px-3 py-1 text-sm font-semibold text-white">Portal de la ONG</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <TestnetBadge />
            <span className="flex items-center gap-2 rounded-full bg-bosque px-5 py-2 font-semibold text-white">
              <span aria-hidden className="h-2 w-2 rounded-full bg-salvia" />
              {session.displayName}
              {session.stellarAccount ? <span className="font-mono text-sm">· {shortAccount(session.stellarAccount)}</span> : null}
            </span>
            <form action={salir}>
              <button type="submit" className="font-medium text-bosque underline">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
