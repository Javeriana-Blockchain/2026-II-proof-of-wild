import type { ReactNode } from "react";
import { requireActor } from "@/app/_lib/auth";
import { logout } from "../ingresar/actions";

export const dynamic = "force-dynamic";

const ROLE_LABELS = { center: "Centro", validator: "Validador", admin: "Administración" } as const;

/** Todo lo que cuelga de este grupo exige sesión; sin ella se redirige al ingreso. */
export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const actor = await requireActor();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg bg-white px-4 py-2 text-sm">
        <span>
          Sesión: <strong>{ROLE_LABELS[actor.role]}</strong>
        </span>
        <form action={logout}>
          <button type="submit" className="underline">
            Cerrar sesión
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
