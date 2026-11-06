import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Esquema relacional del MVP. Todo vive aquí; en Stellar solo van pagos y hashes.
 * Los montos usan 7 decimales, como Stellar. Los hashes SHA-256 se guardan en hexadecimal (64 caracteres).
 * Las restricciones CHECK hacen cumplir en la base de datos las reglas RN-01 y RN-02.
 */

export const verificationStatus = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const userRole = pgEnum("user_role", ["center", "validator", "admin"]);
export const caseStage = pgEnum("case_stage", [
  "ingreso",
  "cuarentena",
  "evaluacion_veterinaria",
  "rehabilitacion",
  "revision_progreso",
  "destino_final",
]);
export const finalDestination = pgEnum("final_destination", [
  "liberacion",
  "reubicacion",
  "santuario",
  "fallecimiento",
]);
export const needCategory = pgEnum("need_category", [
  "alimentacion",
  "atencion_veterinaria",
  "medicamentos",
  "rehabilitacion",
  "destino_final",
]);
export const contributionKind = pgEnum("contribution_kind", ["unico", "recurrente"]);
export const expenseStatus = pgEnum("expense_status", [
  "borrador",
  "pendiente",
  "verificado",
  "rechazado",
]);
export const validationLevel = pgEnum("validation_level", [
  "presentado",
  "revisado",
  "verificado_independiente",
]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const money = (name: string) => numeric(name, { precision: 20, scale: 7 });

export const centers = pgTable("centers", {
  id: id(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  /** Cuenta Stellar que recibe los aportes. Se vincula al dominio del centro con stellar.toml (SEP-1). */
  stellarAccount: text("stellar_account").notNull().unique(),
  domain: text("domain"),
  verificationStatus: verificationStatus("verification_status").notNull().default("pending"),
  createdAt: createdAt(),
});

export const appUsers = pgTable(
  "app_users",
  {
    id: id(),
    role: userRole("role").notNull(),
    centerId: uuid("center_id").references(() => centers.id),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    /** Cuenta Stellar con la que firma anclajes (centro) o validaciones (validador). */
    stellarAccount: text("stellar_account"),
    createdAt: createdAt(),
  },
  (t) => [
    check("app_users_center_required", sql`${t.role} = 'admin' OR ${t.centerId} IS NOT NULL`),
  ],
);

export const donors = pgTable("donors", {
  id: id(),
  /** Los donantes se identifican por su billetera; no tienen contraseña. */
  stellarAccount: text("stellar_account").notNull().unique(),
  displayName: text("display_name"),
  email: text("email"),
  createdAt: createdAt(),
});

export const cases = pgTable(
  "cases",
  {
    id: id(),
    /** Código de ingreso, por ejemplo POW-001. Va en el memo de texto del pago (máx. 28 bytes). */
    code: text("code").notNull().unique(),
    centerId: uuid("center_id")
      .notNull()
      .references(() => centers.id),
    species: text("species").notNull(),
    /** La especie solo se muestra cuando es seguro divulgarla (RN-05). */
    speciesPublic: boolean("species_public").notNull().default(false),
    intakeDate: date("intake_date").notNull(),
    initialState: text("initial_state").notNull(),
    goalAmount: money("goal_amount").notNull(),
    currentStage: caseStage("current_stage").notNull().default("ingreso"),
    finalDestination: finalDestination("final_destination"),
    createdAt: createdAt(),
  },
  (t) => [
    check("cases_code_format", sql`${t.code} ~ '^POW-[0-9]{3,6}$'`),
    check("cases_goal_positive", sql`${t.goalAmount} > 0`),
    index("cases_center_idx").on(t.centerId),
  ],
);

export const needs = pgTable(
  "needs",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    category: needCategory("category").notNull(),
    budgetAmount: money("budget_amount").notNull(),
  },
  (t) => [
    unique("needs_case_category_uq").on(t.caseId, t.category),
    check("needs_budget_nonnegative", sql`${t.budgetAmount} >= 0`),
  ],
);

export const contributions = pgTable(
  "contributions",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    donorId: uuid("donor_id")
      .notNull()
      .references(() => donors.id),
    amount: money("amount").notNull(),
    assetCode: text("asset_code").notNull(),
    /** Único: confirmar dos veces la misma transacción no duplica el aporte (ADR-04). */
    txHash: text("tx_hash").notNull().unique(),
    kind: contributionKind("kind").notNull().default("unico"),
    /**
     * Fecha de la transacción en la red. Solo existen filas de aportes que el servidor ya leyó en la red
     * (RN-03); los envíos aún sin confirmar viven en pending_contributions.
     */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("contributions_amount_positive", sql`${t.amount} > 0`),
    check("contributions_tx_hash_format", sql`${t.txHash} ~ '^[0-9a-f]{64}$'`),
    index("contributions_case_idx").on(t.caseId),
    index("contributions_donor_idx").on(t.donorId),
  ],
);

/**
 * Aportes que el navegador informó pero que la red aún no muestra, o que no se pudieron leer porque la
 * red no respondió (QA-DIS-01). La tarea de reconciliación los reintenta (ADR-04).
 */
export const pendingContributions = pgTable(
  "pending_contributions",
  {
    txHash: text("tx_hash").primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  },
  (t) => [
    check("pending_contributions_tx_hash_format", sql`${t.txHash} ~ '^[0-9a-f]{64}$'`),
    index("pending_contributions_submitted_idx").on(t.submittedAt),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    category: needCategory("category").notNull(),
    amount: money("amount").notNull(),
    /** Clave del soporte en el almacén privado de evidencias. */
    supportKey: text("support_key"),
    /** SHA-256 del soporte; es lo que se ancla en la red. */
    supportHash: text("support_hash").notNull(),
    status: expenseStatus("status").notNull().default("borrador"),
    registeredBy: uuid("registered_by")
      .notNull()
      .references(() => appUsers.id),
    validatedBy: uuid("validated_by").references(() => appUsers.id),
    anchorTxHash: text("anchor_tx_hash").unique(),
    validationTxHash: text("validation_tx_hash").unique(),
    createdAt: createdAt(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amount} > 0`),
    check("expenses_support_hash_format", sql`${t.supportHash} ~ '^[0-9a-f]{64}$'`),
    // RN-02: quien registra no valida.
    check(
      "expenses_registrant_not_validator",
      sql`${t.validatedBy} IS NULL OR ${t.validatedBy} <> ${t.registeredBy}`,
    ),
    // RN-01 y QA-TRZ-01: nada se muestra como pendiente o verificado sin su ancla en la red.
    check(
      "expenses_anchor_required",
      sql`${t.status} NOT IN ('pendiente', 'verificado') OR ${t.anchorTxHash} IS NOT NULL`,
    ),
    check(
      "expenses_verified_requires_validation",
      sql`${t.status} <> 'verificado' OR (${t.validatedBy} IS NOT NULL AND ${t.validationTxHash} IS NOT NULL)`,
    ),
    index("expenses_case_idx").on(t.caseId),
  ],
);

export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    stage: caseStage("stage").notNull(),
    occurredAt: date("occurred_at").notNull(),
    description: text("description").notNull(),
    evidenceKey: text("evidence_key"),
    /** SHA-256 del archivo de evidencia o, sin archivo, del JSON canónico del registro. */
    evidenceHash: text("evidence_hash").notNull(),
    validationLevel: validationLevel("validation_level").notNull().default("presentado"),
    registeredBy: uuid("registered_by")
      .notNull()
      .references(() => appUsers.id),
    validatedBy: uuid("validated_by").references(() => appUsers.id),
    /** Nulo = borrador, aún no publicado. */
    anchorTxHash: text("anchor_tx_hash").unique(),
    validationTxHash: text("validation_tx_hash").unique(),
    createdAt: createdAt(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
  },
  (t) => [
    check("milestones_evidence_hash_format", sql`${t.evidenceHash} ~ '^[0-9a-f]{64}$'`),
    // RN-02: quien registra no valida.
    check(
      "milestones_registrant_not_validator",
      sql`${t.validatedBy} IS NULL OR ${t.validatedBy} <> ${t.registeredBy}`,
    ),
    check(
      "milestones_validated_requires_validation",
      sql`${t.validationLevel} = 'presentado' OR (${t.validatedBy} IS NOT NULL AND ${t.validationTxHash} IS NOT NULL)`,
    ),
    index("milestones_case_idx").on(t.caseId),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);
