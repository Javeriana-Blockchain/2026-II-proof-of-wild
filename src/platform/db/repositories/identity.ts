import { eq } from "drizzle-orm";
import type { IdentityRecord, IdentityStore } from "@/modules/identity";
import type { Db } from "../client";
import { identityVerifications, personProfiles } from "../schema";

const columns = {
  userId: identityVerifications.userId,
  documentType: identityVerifications.documentType,
  documentLast4: identityVerifications.documentLast4,
  method: identityVerifications.method,
  faceMatch: identityVerifications.faceMatch,
  provider: identityVerifications.provider,
  providerReference: identityVerifications.providerReference,
  verifiedAt: identityVerifications.verifiedAt,
};

type Row = Omit<typeof identityVerifications.$inferSelect, "documentHash" | "consentAt">;

function toRecord(row: Row): IdentityRecord {
  return { ...row, faceMatch: row.faceMatch == null ? null : Number(row.faceMatch) };
}

export class DbIdentityStore implements IdentityStore {
  constructor(private readonly db: Db) {}

  async find(userId: string): Promise<IdentityRecord | null> {
    const [row] = await this.db.select(columns).from(identityVerifications).where(eq(identityVerifications.userId, userId)).limit(1);
    return row ? toRecord(row) : null;
  }

  async findUserByDocument(documentHash: string): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: identityVerifications.userId })
      .from(identityVerifications)
      .where(eq(identityVerifications.documentHash, documentHash))
      .limit(1);
    return row?.userId ?? null;
  }

  async save(record: IdentityRecord & { documentHash: string; consentAt: Date }): Promise<void> {
    const values = { ...record, faceMatch: record.faceMatch == null ? null : record.faceMatch.toFixed(3) };
    const { userId: _userId, ...update } = values;
    await this.db
      .insert(identityVerifications)
      .values(values)
      .onConflictDoUpdate({ target: identityVerifications.userId, set: update });
  }

  async remove(userId: string): Promise<void> {
    await this.db.delete(identityVerifications).where(eq(identityVerifications.userId, userId));
  }
}

/** ¿La persona dueña de esta billetera verificó su identidad? Para la página pública de la huella. */
export async function isAccountVerified(db: Db, account: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: identityVerifications.userId })
    .from(identityVerifications)
    .innerJoin(personProfiles, eq(personProfiles.userId, identityVerifications.userId))
    .where(eq(personProfiles.stellarAccount, account))
    .limit(1);
  return !!row;
}
