import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findSessionUser, SESSION_COOKIE, type Role, type SessionUser } from "@/platform/auth";
import { getDb } from "@/platform/db/client";

/** Usuario de la sesión de esta petición, o nulo. Se consulta una sola vez por petición. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findSessionUser(getDb(), token);
});

/** Exige sesión (y, si se indica, un rol). Sin sesión lleva a ingresar y vuelve a la página pedida. */
export async function requireSession(returnTo: string, ...roles: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(`/ingresar?modo=ingresar&volver=${encodeURIComponent(returnTo)}`);
  if (roles.length > 0 && !roles.includes(session.role)) redirect(homeFor(session));
  return session;
}

/** A dónde va cada usuario al ingresar: la persona a su perfil y la ONG a su portal (o a su registro). */
export function homeFor(session: Pick<SessionUser, "role" | "ngoId" | "profileCompleted">): string {
  if (session.role === "ong") return session.ngoId ? "/portal" : "/ong/registro";
  if (session.role === "admin") return "/";
  return session.profileCompleted ? "/perfil" : "/cuenta/perfil";
}
