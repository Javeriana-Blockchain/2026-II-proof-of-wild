import { CatalogService } from "@/modules/catalog";
import { ContributionService } from "@/modules/contributions";
import { ExpenseService } from "@/modules/expenses";
import { getExplorerEnv } from "@/platform/config/env";
import { getDb } from "@/platform/db/client";
import { DbCatalogReader } from "@/platform/db/repositories/catalog";
import {
  DbCaseLookup,
  DbContributionStore,
  DbDonorStore,
  DbPendingStore,
} from "@/platform/db/repositories/contributions";
import {
  DbExpenseCaseLookup,
  DbExpenseStore,
  DbFundsReader,
} from "@/platform/db/repositories/expenses";
import { createClassicStellarAdapter } from "@/platform/stellar";
import { createEvidenceStorage } from "@/platform/storage";

/**
 * Raíz de composición: el único lugar que conoce a la vez los módulos de dominio y sus adaptadores.
 * Cada servicio se crea al primer uso, así que una ruta solo exige la configuración que realmente necesita
 * (por ejemplo, el catálogo no necesita las variables de Stellar). Para pasar a la etapa 2 basta cambiar
 * el adaptador Stellar por uno de contrato Soroban (ADR-09).
 */
function once<T>(factory: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= factory());
}

const stellar = once(createClassicStellarAdapter);

export const getCatalogService = once(
  () => new CatalogService(new DbCatalogReader(getDb()), getExplorerEnv().EXPLORER_BASE_URL),
);

export const getContributionService = once(() => {
  const db = getDb();
  return new ContributionService({
    rail: stellar(),
    cases: new DbCaseLookup(db),
    contributions: new DbContributionStore(db),
    donors: new DbDonorStore(db),
    pending: new DbPendingStore(db),
  });
});

export const getExpenseService = once(() => {
  const db = getDb();
  return new ExpenseService({
    anchor: stellar(),
    expenses: new DbExpenseStore(db),
    cases: new DbExpenseCaseLookup(db),
    funds: new DbFundsReader(db),
  });
});

export const getEvidenceStorage = once(createEvidenceStorage);
