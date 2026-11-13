/**
 * Pasa a la base de datos las evidencias guardadas en disco (EVIDENCE_DIR) con su misma clave, para que los
 * enlaces y los hashes ya registrados en la red sigan sirviendo. Es idempotente.
 *
 *   npx tsx --env-file=.env scripts/evidencias-a-bd.ts
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "@/lib/hash";
import { getDb } from "@/platform/db/client";
import { evidenceFiles } from "@/platform/db/schema";
import { EVIDENCE_KEY_PATTERN } from "@/platform/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

async function main() {
  const dir = process.env.EVIDENCE_DIR ?? "./.data/evidence";
  const keys = (await readdir(dir).catch(() => [])).filter((name) => EVIDENCE_KEY_PATTERN.test(name));
  const db = getDb();
  let copied = 0;
  for (const key of keys) {
    const data = await readFile(path.join(dir, key));
    const inserted = await db
      .insert(evidenceFiles)
      .values({
        key,
        contentType: TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream",
        sha256: await sha256Hex(new Uint8Array(data)),
        sizeBytes: data.byteLength,
        data,
      })
      .onConflictDoNothing()
      .returning({ key: evidenceFiles.key });
    copied += inserted.length;
  }
  console.log(`${copied} evidencias copiadas a la base de datos (${keys.length - copied} ya estaban).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
