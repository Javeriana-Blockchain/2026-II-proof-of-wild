import type { Db } from "@/platform/db/client";
import { personProfiles, users } from "@/platform/db/schema";
import { isSrpHex, normalizeEmail } from "./srp";

export class EmailTakenError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese correo. Ingresa con tu contraseña.");
    this.name = "EmailTakenError";
  }
}

export interface NewAccount {
  email: string;
  /** «persona» (donante, voluntaria o las dos) u «ong». Los administradores solo los crea el script. */
  role: "persona" | "ong";
  /** Sal y verificador SRP derivados en el navegador: la contraseña nunca llega al servidor. */
  salt: string;
  verifier: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Crea la cuenta. A una persona se le crea además su perfil vacío con la autorización de datos
 * (Ley 1581 de 2012); la ONG llena su registro en el paso siguiente.
 */
export async function registerAccount(db: Db, input: NewAccount, now = new Date()): Promise<{ userId: string }> {
  const email = normalizeEmail(input.email);
  if (!EMAIL.test(email) || email.length > 200) throw new RangeError("El correo no es válido.");
  if (!isSrpHex(input.salt) || !isSrpHex(input.verifier)) throw new RangeError("Datos de autenticación inválidos.");

  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email, role: input.role, srpSalt: input.salt, srpVerifier: input.verifier })
        .returning({ id: users.id });
      if (!user) throw new Error("No se pudo crear la cuenta.");
      if (input.role === "persona") {
        await tx.insert(personProfiles).values({ userId: user.id, dataConsentAt: now });
      }
      return { userId: user.id };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new EmailTakenError();
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } } | null);
  return code?.code === "23505" || code?.cause?.code === "23505";
}
