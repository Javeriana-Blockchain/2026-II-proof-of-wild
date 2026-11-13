import { createHmac } from "node:crypto";
import { CatalogService } from "@/modules/catalog";
import { ContributionService } from "@/modules/contributions";
import { IdentityService } from "@/modules/identity";
import { RecordService } from "@/modules/records";
import { getContractEnv, getExplorerEnv, getSessionEnv } from "@/platform/config/env";
import { getDb } from "@/platform/db/client";
import { DbCatalogReader } from "@/platform/db/repositories/catalog";
import { DbContributionStore } from "@/platform/db/repositories/contributions";
import { DbIdentityStore } from "@/platform/db/repositories/identity";
import { DbRecordStore } from "@/platform/db/repositories/records";
import { SimulatedIdentityRegistry } from "@/platform/identity/simulated-registry";
import { SorobanContractLedger } from "@/platform/stellar/contract-ledger";
import { createEvidenceStorage } from "@/platform/storage";

/**
 * Raíz de composición: el único lugar que conoce a la vez los módulos de dominio y sus adaptadores.
 * Cada servicio se crea al primer uso, así que una ruta solo exige la configuración que realmente necesita
 * (el catálogo no necesita las variables del contrato).
 */
function once<T>(factory: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= factory());
}

export const getEvidenceStorage = once(createEvidenceStorage);

/** Las rutas de public/ (fotos de la demo) se usan tal cual; las claves del almacén van por su ruta pública. */
export function evidenceUrl(keyOrPath: string): string {
  return keyOrPath.startsWith("/") ? keyOrPath : getEvidenceStorage().publicUrl(keyOrPath);
}

export const getCatalogService = once(
  () =>
    new CatalogService(new DbCatalogReader(getDb()), {
      explorerBaseUrl: getExplorerEnv().EXPLORER_BASE_URL,
      evidenceUrl,
    }),
);

/** Adaptador del contrato Proof of Wild en Soroban (ADR-09, ADR-11). */
export const getContractLedger = once(() => {
  const env = getContractEnv();
  return new SorobanContractLedger({
    rpcUrl: env.SOROBAN_RPC_URL,
    networkPassphrase: env.NETWORK_PASSPHRASE,
    contractId: env.CONTRACT_ID,
  });
});

export const getContributionService = once(
  () => new ContributionService(getContractLedger(), new DbContributionStore(getDb())),
);

/**
 * Verificación de identidad por niveles (ADR-21). El documento se guarda como HMAC con la clave de sesión: así se
 * detecta un documento usado en dos cuentas sin guardar el número (una cédula se adivina por fuerza bruta si solo
 * se le aplica SHA-256).
 */
export const getIdentityService = once(() => {
  const secret = getSessionEnv().SESSION_SECRET;
  return new IdentityService(new SimulatedIdentityRegistry(), new DbIdentityStore(getDb()), {
    hashDocument: (type, number) => createHmac("sha256", secret).update(`${type}:${number}`).digest("hex"),
  });
});

export const getRecordService = once(
  () => new RecordService(getContractLedger(), new DbRecordStore(getDb()), getEvidenceStorage()),
);
