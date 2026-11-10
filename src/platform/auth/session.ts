import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "@/platform/db/client";
import { ngos, personProfiles, sessions, users } from "@/platform/db/schema";

export const SESSION_COOKIE = "pow_sesion";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type Role = (typeof users.$inferSelect)["role"];

/** Usuario de la sesión, con lo necesario para el menú y para autorizar operaciones. */
export interface SessionUser {
  userId: string;
  email: string;
  role: Role;
  /** Alias de la persona o nombre de la ONG; si aún no hay perfil, el correo. */
  displayName: string;
  /** ONG del usuario, si tiene una registrada. */
  ngoId: string | null;
  ngoStatus: (typeof ngos.$inferSelect)["status"] | null;
  /** Billetera registrada en su perfil (persona) o cuenta de la ONG. */
  stellarAccount: string | null;
  profileCompleted: boolean;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Crea la sesión y devuelve el token para la cookie. En la base solo queda SHA-256(token). */
export async function createSession(db: Db, userId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

/** Sesión vigente (no cerrada, no vencida y de un usuario activo), o nulo. */
export async function findSessionUser(db: Db, token: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({
      userId: users.id,
      email: users.email,
      role: users.role,
      alias: personProfiles.alias,
      profileCompletedAt: personProfiles.completedAt,
      personAccount: personProfiles.stellarAccount,
      ngoId: ngos.id,
      ngoName: ngos.name,
      ngoStatus: ngos.status,
      ngoAccount: ngos.stellarAccount,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(personProfiles, eq(personProfiles.userId, users.id))
    .leftJoin(ngos, eq(ngos.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.closedAt),
        gt(sessions.expiresAt, new Date()),
        eq(users.active, true),
      ),
    )
    .limit(1);
  if (!row) return null;

  return {
    userId: row.userId,
    email: row.email,
    role: row.role,
    displayName: row.ngoName ?? row.alias ?? row.email,
    ngoId: row.ngoId,
    ngoStatus: row.ngoStatus,
    stellarAccount: row.ngoAccount ?? row.personAccount,
    profileCompleted: row.role !== "persona" || row.profileCompletedAt !== null,
  };
}

export async function closeSession(db: Db, token: string): Promise<void> {
  await db
    .update(sessions)
    .set({ closedAt: new Date() })
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.closedAt)));
}
