import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { sumAmounts } from "@/lib/amount";
import type { Db } from "../client";
import {
  cases,
  contributionAllocations,
  contributions,
  donors,
  enrollments,
  expenses,
  milestones,
  ngos,
  personProfiles,
  stages,
  volunteerings,
} from "../schema";

export interface DonorCase {
  code: string;
  name: string;
  photoPath: string | null;
  ngoName: string;
  /** En qué etapas se usó el aporte de esta billetera. */
  allocations: Array<{ stageName: string; amount: string }>;
  lastUpdate: { at: string; text: string } | null;
}

export interface DonorView {
  account: string;
  /** Alias público, si la persona lo eligió y quiere mostrarlo. */
  alias: string | null;
  contributions: Array<{ txHash: string; caseCode: string; caseName: string; amount: string; confirmedAt: string }>;
  cases: DonorCase[];
  totalAmount: string;
  volunteerings: Array<{ ngoName: string; title: string; date: string }>;
}

/**
 * Lo que se sabe públicamente de una billetera que aporta: sus aportes confirmados (están en la red), en qué
 * se usaron y, si la persona lo permite, su alias. Nunca su nombre, correo ni teléfono.
 */
export async function getDonorView(db: Db, account: string, userId?: string): Promise<DonorView> {
  const [profile] = await db
    .select({ alias: personProfiles.alias, showAlias: personProfiles.showAlias, userId: personProfiles.userId })
    .from(personProfiles)
    .where(eq(personProfiles.stellarAccount, account))
    .limit(1);
  const [donor] = await db.select({ alias: donors.alias }).from(donors).where(eq(donors.stellarAccount, account)).limit(1);
  const alias = profile ? (profile.showAlias ? profile.alias : null) : (donor?.alias ?? null);

  const rows = await db
    .select({
      id: contributions.id,
      txHash: contributions.txHash,
      caseId: cases.id,
      caseCode: cases.code,
      caseName: cases.commonName,
      speciesPublic: cases.speciesPublic,
      photoPath: cases.photoPath,
      ngoName: ngos.name,
      amount: contributions.amount,
      confirmedAt: contributions.confirmedAt,
    })
    .from(contributions)
    .innerJoin(cases, eq(cases.id, contributions.caseId))
    .innerJoin(ngos, eq(ngos.id, cases.ngoId))
    .where(and(eq(contributions.donorAccount, account), eq(contributions.status, "confirmada")))
    .orderBy(desc(contributions.confirmedAt));

  const ids = rows.map((r) => r.id);
  const caseIds = [...new Set(rows.map((r) => r.caseId))];
  const [allocationRows, milestoneRows, expenseRows] = await Promise.all([
    ids.length
      ? db
          .select({ contributionId: contributionAllocations.contributionId, stageName: stages.name, position: stages.position, amount: contributionAllocations.amount })
          .from(contributionAllocations)
          .innerJoin(stages, eq(stages.id, contributionAllocations.stageId))
          .where(inArray(contributionAllocations.contributionId, ids))
          .orderBy(asc(stages.position))
      : [],
    caseIds.length
      ? db
          .select({ caseId: milestones.caseId, at: milestones.occurredOn, text: milestones.description })
          .from(milestones)
          .where(and(inArray(milestones.caseId, caseIds), eq(milestones.status, "confirmada")))
          .orderBy(desc(milestones.occurredOn))
      : [],
    caseIds.length
      ? db
          .select({ caseId: expenses.caseId, at: expenses.occurredOn, stageName: stages.name, concept: expenses.concept })
          .from(expenses)
          .innerJoin(stages, eq(stages.id, expenses.stageId))
          .where(and(inArray(expenses.caseId, caseIds), eq(expenses.status, "confirmada")))
          .orderBy(desc(expenses.occurredOn))
      : [],
  ]);

  const name = (r: { caseName: string; speciesPublic: boolean }) => (r.speciesPublic ? r.caseName : "Especie reservada");
  const byCase = new Map<string, DonorCase>();
  for (const r of rows) {
    const entry =
      byCase.get(r.caseId) ??
      ({ code: r.caseCode, name: name(r), photoPath: r.photoPath, ngoName: r.ngoName, allocations: [], lastUpdate: null } as DonorCase);
    for (const a of allocationRows.filter((x) => x.contributionId === r.id)) {
      const existing = entry.allocations.find((x) => x.stageName === a.stageName);
      if (existing) existing.amount = sumAmounts([existing.amount, a.amount]);
      else entry.allocations.push({ stageName: a.stageName, amount: a.amount });
    }
    byCase.set(r.caseId, entry);
  }
  for (const [caseId, entry] of byCase) {
    const m = milestoneRows.find((x) => x.caseId === caseId);
    const e = expenseRows.find((x) => x.caseId === caseId);
    const fromExpense = e ? { at: e.at, text: `la ONG pagó ${(e.concept ?? e.stageName).toLowerCase()}.` } : null;
    const fromMilestone = m ? { at: m.at, text: m.text } : null;
    entry.lastUpdate = [fromExpense, fromMilestone].filter(Boolean).sort((a, b) => b!.at.localeCompare(a!.at))[0] ?? null;
  }

  const ownerId = userId ?? profile?.userId;
  const volunteeringRows = ownerId
    ? await db
        .select({ ngoName: ngos.name, title: volunteerings.title, date: volunteerings.date })
        .from(enrollments)
        .innerJoin(volunteerings, eq(volunteerings.id, enrollments.volunteeringId))
        .innerJoin(ngos, eq(ngos.id, volunteerings.ngoId))
        .where(eq(enrollments.userId, ownerId))
        .orderBy(asc(volunteerings.date))
    : [];

  return {
    account,
    alias,
    contributions: rows.map((r) => ({
      txHash: r.txHash,
      caseCode: r.caseCode,
      caseName: name(r),
      amount: r.amount,
      confirmedAt: (r.confirmedAt ?? new Date(0)).toISOString(),
    })),
    cases: [...byCase.values()],
    totalAmount: sumAmounts(rows.map((r) => r.amount)),
    volunteerings: volunteeringRows,
  };
}

/** Voluntariados de una persona sin billetera vinculada (para su perfil). */
export async function enrollmentsOf(db: Db, userId: string) {
  return db
    .select({ ngoName: ngos.name, title: volunteerings.title, date: volunteerings.date })
    .from(enrollments)
    .innerJoin(volunteerings, eq(volunteerings.id, enrollments.volunteeringId))
    .innerJoin(ngos, eq(ngos.id, volunteerings.ngoId))
    .where(eq(enrollments.userId, userId))
    .orderBy(asc(volunteerings.date));
}
