import { getSession } from "@/app/_lib/session";
import type { SessionUser } from "@/platform/auth";
import { AuthRequiredError, PermissionError } from "@/modules/shared/errors";

/**
 * Apadrinar exige una cuenta de persona con la sesión iniciada: así el aporte queda en su perfil y su billetera se
 * liga a su cuenta. Sin sesión responde 401; con una cuenta de ONG o de administrador, 403.
 */
export async function requireDonor(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthRequiredError("Inicia sesión o crea tu cuenta para apadrinar.");
  if (session.role !== "persona") {
    throw new PermissionError("Para apadrinar, entra con una cuenta de persona.");
  }
  return session;
}
