import { CatalogService } from "@/modules/catalog";
import { ContributionService } from "@/modules/contributions";
import { ExpenseService } from "@/modules/expenses";
import { getStellarEnv } from "@/platform/config/env";
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
 * Para pasar a la etapa 2 basta cambiar el adaptador Stellar por uno de contrato Soroban (ADR-09).
 */
export function createContainer() {
  const db = getDb();
  const stellar = createClassicStellarAdapter();

  return {
    catalog: new CatalogService(new DbCatalogReader(db), getStellarEnv().EXPLORER_BASE_URL),
    contributions: new ContributionService({
      rail: stellar,
      cases: new DbCaseLookup(db),
      contributions: new DbContributionStore(db),
      donors: new DbDonorStore(db),
      pending: new DbPendingStore(db),
    }),
    expenses: new ExpenseService({
      anchor: stellar,
      expenses: new DbExpenseStore(db),
      cases: new DbExpenseCaseLookup(db),
      funds: new DbFundsReader(db),
    }),
    storage: createEvidenceStorage(),
  };
}

export type Container = ReturnType<typeof createContainer>;

let instance: Container | undefined;

/** Contenedor único por proceso, creado al primer uso. */
export function getContainer(): Container {
  instance ??= createContainer();
  return instance;
}
