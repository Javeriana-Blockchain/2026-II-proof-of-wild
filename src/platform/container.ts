import { CatalogService } from "@/modules/catalog";
import { getExplorerEnv } from "@/platform/config/env";
import { getDb } from "@/platform/db/client";
import { DbCatalogReader } from "@/platform/db/repositories/catalog";
import { createEvidenceStorage } from "@/platform/storage";

/**
 * Raíz de composición: el único lugar que conoce a la vez los módulos de dominio y sus adaptadores.
 * Cada servicio se crea al primer uso, así que una ruta solo exige la configuración que realmente necesita.
 * El adaptador del contrato Soroban se conecta aquí cuando esté disponible (ADR-09).
 */
function once<T>(factory: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= factory());
}

export const getEvidenceStorage = once(createEvidenceStorage);

/** Las rutas de public/ (fotos de la demo) se usan tal cual; las claves del almacén van por su ruta pública. */
function evidenceUrl(keyOrPath: string): string {
  return keyOrPath.startsWith("/") ? keyOrPath : getEvidenceStorage().publicUrl(keyOrPath);
}

export const getCatalogService = once(
  () =>
    new CatalogService(new DbCatalogReader(getDb()), {
      explorerBaseUrl: getExplorerEnv().EXPLORER_BASE_URL,
      evidenceUrl,
    }),
);
