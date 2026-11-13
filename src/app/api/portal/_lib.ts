import { getSession } from "@/app/_lib/session";
import type { NgoActor } from "@/modules/records";
import { PermissionError, ValidationError } from "@/modules/shared/errors";
import type { EvidenceUpload } from "@/ports/evidence-storage";

/** La ONG de la sesión, solo si su perfil ya está aprobado (las rutas del portal lo exigen). */
export async function requireNgoActor(): Promise<NgoActor> {
  const session = await getSession();
  if (!session || session.role !== "ong") throw new PermissionError("Ingresa con la cuenta de tu ONG.");
  if (!session.ngoId || session.ngoStatus !== "aprobada" || !session.stellarAccount) {
    throw new PermissionError("Tu ONG todavía no está aprobada para registrar gastos e hitos.");
  }
  return { userId: session.userId, ngoId: session.ngoId, ngoAccount: session.stellarAccount };
}

/** Lee el formulario con archivo (multipart). */
export async function readForm(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new ValidationError("El formulario no es válido o el archivo supera 4 MB.");
  }
}

export function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** Archivo subido, o nulo si no se eligió ninguno. */
export async function file(form: FormData, name: string): Promise<EvidenceUpload | null> {
  const value = form.get(name);
  if (!value || typeof value === "string" || value.size === 0) return null;
  return { data: new Uint8Array(await value.arrayBuffer()), contentType: value.type };
}
