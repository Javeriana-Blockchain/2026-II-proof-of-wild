import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Actor, Role } from "@/modules/shared/actor";
import { SESSION_COOKIE, readSessionToken } from "@/platform/auth";
import { getSessionEnv } from "@/platform/config/env";

/** Usuario del portal de la petición actual, o nulo si no hay sesión válida. */
export async function getActor(): Promise<Actor | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token, getSessionEnv().SESSION_SECRET);
}

/** Exige sesión (y, opcionalmente, un rol). Sin sesión redirige al ingreso. */
export async function requireActor(...roles: Role[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/portal/ingresar");
  if (roles.length > 0 && !roles.includes(actor.role)) redirect("/portal");
  return actor;
}
