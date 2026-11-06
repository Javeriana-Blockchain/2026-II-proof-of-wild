import { Keypair } from "@stellar/stellar-sdk";
import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/hash";
import { hashPassword } from "@/platform/auth/password";
import type { Db } from "./client";
import {
  appUsers,
  cases,
  centers,
  contributions,
  donors,
  expenses,
  milestones,
  needs,
} from "./schema";

export interface SeedOptions {
  /**
   * Agrega aportes, gastos e hitos de ejemplo para trabajar la interfaz. Sus hashes de transacción son
   * inventados: NO existen en la red Stellar. No usar para la demo real; allí se registran con Freighter.
   */
  withActivity?: boolean;
  /** Contraseña de los usuarios de demo. Si falta, se genera una aleatoria y se devuelve. */
  password?: string;
  /** Cuenta Stellar del centro (fondeada, con línea de confianza del activo de prueba). */
  centerAccount?: string;
  centerUserAccount?: string;
  validatorAccount?: string;
}

export interface SeedResult {
  skipped: boolean;
  password: string | null;
  centerAccountGenerated: boolean;
  centerId?: string;
  users?: { center: string; validator: string; admin: string };
  cases?: Record<string, string>;
}

/** Hash de ejemplo reproducible. Parece un hash de transacción pero no existe en la red. */
const fakeHash = (label: string) => sha256Hex(`pow-demo:${label}`);

/** Carga 1 centro ficticio con 3 casos en etapas distintas (ingreso, rehabilitación y liberación). */
export async function seedDemo(db: Db, options: SeedOptions = {}): Promise<SeedResult> {
  const existing = await db.select({ id: cases.id }).from(cases).limit(1);
  if (existing.length > 0) {
    return { skipped: true, password: null, centerAccountGenerated: false };
  }

  const password = options.password ?? randomBytes(9).toString("base64url");
  const passwordHash = await hashPassword(password);
  const centerAccount = options.centerAccount ?? Keypair.random().publicKey();

  const [center] = await db
    .insert(centers)
    .values({
      name: "Centro de Atención de Fauna (ficticio)",
      city: "Bogotá",
      stellarAccount: centerAccount,
      domain: "centro-ficticio.example",
      verificationStatus: "verified",
    })
    .returning();
  if (!center) throw new Error("No se pudo crear el centro.");

  const [centerUser, validator, admin] = await db
    .insert(appUsers)
    .values([
      {
        role: "center",
        centerId: center.id,
        email: "centro@demo.proofofwild.example",
        passwordHash,
        displayName: "Responsable del centro (demo)",
        stellarAccount: options.centerUserAccount ?? null,
      },
      {
        role: "validator",
        centerId: center.id,
        email: "validador@demo.proofofwild.example",
        passwordHash,
        displayName: "Veterinario validador (demo)",
        stellarAccount: options.validatorAccount ?? null,
      },
      {
        role: "admin",
        centerId: null,
        email: "admin@demo.proofofwild.example",
        passwordHash,
        displayName: "Administración (demo)",
        stellarAccount: null,
      },
    ])
    .returning();
  if (!centerUser || !validator || !admin) throw new Error("No se pudieron crear los usuarios.");

  const caseRows = await db
    .insert(cases)
    .values([
      {
        code: "POW-001",
        centerId: center.id,
        species: "Ave rapaz",
        speciesPublic: false,
        intakeDate: "2026-11-02",
        initialState: "Recién ingresada. Desnutrición leve y ala lesionada; en observación.",
        goalAmount: "800",
        currentStage: "ingreso",
      },
      {
        code: "POW-002",
        centerId: center.id,
        species: "Mono aullador",
        speciesPublic: true,
        intakeDate: "2026-09-14",
        initialState: "Deshidratación y heridas por cautiverio. Cuarentena superada.",
        goalAmount: "2500",
        currentStage: "rehabilitacion",
      },
      {
        code: "POW-003",
        centerId: center.id,
        species: "Tortuga morrocoy",
        speciesPublic: true,
        intakeDate: "2026-06-20",
        initialState: "Decomisada en buen estado general; requería evaluación y adaptación.",
        goalAmount: "1200",
        currentStage: "destino_final",
        finalDestination: "liberacion",
      },
    ])
    .returning();
  const byCode = Object.fromEntries(caseRows.map((c) => [c.code, c.id])) as Record<string, string>;

  await db.insert(needs).values(
    caseRows.flatMap((c) => {
      const goal = Number(c.goalAmount);
      return [
        { caseId: c.id, category: "alimentacion" as const, budgetAmount: String(goal * 0.2) },
        { caseId: c.id, category: "atencion_veterinaria" as const, budgetAmount: String(goal * 0.35) },
        { caseId: c.id, category: "medicamentos" as const, budgetAmount: String(goal * 0.15) },
        { caseId: c.id, category: "rehabilitacion" as const, budgetAmount: String(goal * 0.2) },
        { caseId: c.id, category: "destino_final" as const, budgetAmount: String(goal * 0.1) },
      ];
    }),
  );

  if (options.withActivity) {
    await seedActivity(db, byCode, { centerUserId: centerUser.id, validatorId: validator.id });
  }

  return {
    skipped: false,
    password: options.password ? null : password,
    centerAccountGenerated: !options.centerAccount,
    centerId: center.id,
    users: { center: centerUser.id, validator: validator.id, admin: admin.id },
    cases: byCode,
  };
}

async function seedActivity(
  db: Db,
  caseIds: Record<string, string>,
  who: { centerUserId: string; validatorId: string },
): Promise<void> {
  const [donorA, donorB] = await db
    .insert(donors)
    .values([
      { stellarAccount: Keypair.random().publicKey() },
      { stellarAccount: Keypair.random().publicKey() },
    ])
    .returning();
  if (!donorA || !donorB) throw new Error("No se pudieron crear los donantes.");

  const confirmed = async (label: string, caseCode: string, donorId: string, amount: string, at: string) => ({
    caseId: caseIds[caseCode] as string,
    donorId,
    amount,
    assetCode: "USDC",
    txHash: await fakeHash(`contribution:${label}`),
    confirmedAt: new Date(at),
  });

  await db.insert(contributions).values([
    await confirmed("a", "POW-002", donorA.id, "40", "2026-10-10T15:00:00Z"),
    await confirmed("b", "POW-002", donorB.id, "25.5", "2026-10-12T16:30:00Z"),
    await confirmed("c", "POW-003", donorA.id, "1200", "2026-08-01T14:00:00Z"),
  ]);

  const expense = async (
    label: string,
    caseCode: string,
    category: "alimentacion" | "medicamentos",
    amount: string,
    status: "borrador" | "pendiente" | "verificado",
  ) => ({
    caseId: caseIds[caseCode] as string,
    category,
    amount,
    supportHash: await fakeHash(`support:${label}`),
    status,
    registeredBy: who.centerUserId,
    validatedBy: status === "verificado" ? who.validatorId : null,
    anchorTxHash: status === "borrador" ? null : await fakeHash(`expense-anchor:${label}`),
    validationTxHash: status === "verificado" ? await fakeHash(`expense-validation:${label}`) : null,
    validatedAt: status === "verificado" ? new Date("2026-10-20T12:00:00Z") : null,
  });

  await db.insert(expenses).values([
    await expense("med-1", "POW-002", "medicamentos", "30", "verificado"),
    await expense("food-1", "POW-002", "alimentacion", "12", "pendiente"),
    await expense("draft-1", "POW-002", "alimentacion", "5", "borrador"),
  ]);

  const milestone = async (
    label: string,
    caseCode: string,
    stage: "ingreso" | "cuarentena" | "evaluacion_veterinaria" | "rehabilitacion" | "destino_final",
    occurredAt: string,
    description: string,
    level: "presentado" | "revisado",
    published = true,
  ) => ({
    caseId: caseIds[caseCode] as string,
    stage,
    occurredAt,
    description,
    evidenceHash: await fakeHash(`evidence:${label}`),
    validationLevel: level,
    registeredBy: who.centerUserId,
    validatedBy: level === "revisado" ? who.validatorId : null,
    anchorTxHash: published ? await fakeHash(`milestone-anchor:${label}`) : null,
    validationTxHash: level === "revisado" ? await fakeHash(`milestone-validation:${label}`) : null,
  });

  await db.insert(milestones).values([
    await milestone("p1-ingreso", "POW-001", "ingreso", "2026-11-02", "Ingreso al centro y evaluación inicial.", "presentado"),
    await milestone("p2-ingreso", "POW-002", "ingreso", "2026-09-14", "Ingreso al centro.", "presentado"),
    await milestone("p2-cuarentena", "POW-002", "cuarentena", "2026-09-15", "Cuarentena de 30 días sin complicaciones.", "revisado"),
    await milestone("p2-eval", "POW-002", "evaluacion_veterinaria", "2026-10-16", "Evaluación veterinaria completa.", "revisado"),
    await milestone("p2-rehab", "POW-002", "rehabilitacion", "2026-10-25", "Inicio de rehabilitación en recinto de adaptación.", "presentado"),
    await milestone("p2-borrador", "POW-002", "rehabilitacion", "2026-11-01", "Borrador aún sin publicar.", "presentado", false),
    await milestone("p3-ingreso", "POW-003", "ingreso", "2026-06-20", "Ingreso al centro.", "presentado"),
    await milestone("p3-destino", "POW-003", "destino_final", "2026-09-30", "Liberación en su hábitat.", "revisado"),
  ]);
}
