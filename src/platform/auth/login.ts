import { eq } from "drizzle-orm";
import type { Actor } from "@/modules/shared/actor";
import type { Db } from "@/platform/db/client";
import { appUsers } from "@/platform/db/schema";
import { verifyPassword } from "./password";

/** Hash de relleno para que verificar un correo inexistente tarde lo mismo que uno existente. */
const DUMMY_HASH =
  "scrypt:00000000000000000000000000000000:" + "0".repeat(128);

/**
 * Autentica a un usuario del portal (centro, validador o administrador) por correo y contraseña.
 * Devuelve nulo ante cualquier fallo, sin distinguir si el correo existe (ADR-08).
 */
export async function authenticate(db: Db, email: string, password: string): Promise<Actor | null> {
  const [user] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, email.trim().toLowerCase()))
    .limit(1);

  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return null;

  return {
    userId: user.id,
    role: user.role,
    centerId: user.centerId,
    stellarAccount: user.stellarAccount,
  };
}
