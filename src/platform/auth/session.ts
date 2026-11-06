import { jwtVerify, SignJWT } from "jose";
import type { Actor, Role } from "@/modules/shared/actor";

export const SESSION_COOKIE = "pow_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

const ROLES: readonly Role[] = ["center", "validator", "admin"];

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** Crea el token de sesión (JWT firmado HS256) para un usuario del portal. */
export async function createSessionToken(
  actor: Actor,
  secret: string,
  ttlSeconds = SESSION_TTL_SECONDS,
): Promise<string> {
  return new SignJWT({
    role: actor.role,
    centerId: actor.centerId,
    stellarAccount: actor.stellarAccount,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(actor.userId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(secret));
}

/** Devuelve el usuario de la sesión, o nulo si el token es inválido, está alterado o venció. */
export async function readSessionToken(token: string, secret: string): Promise<Actor | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    const role = payload.role as Role;
    if (!payload.sub || !ROLES.includes(role)) return null;
    return {
      userId: payload.sub,
      role,
      centerId: (payload.centerId as string | null) ?? null,
      stellarAccount: (payload.stellarAccount as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
