/**
 * Pone en una base ya sembrada las fotos de los casos y de sus etapas que dicen los datos de prueba
 * (demo-data.ts), sin volver a sembrar: no toca cuentas, aportes, gastos ni hitos. Es idempotente.
 *
 *   npm run db:fotos                                  (la base de .env)
 *   npx tsx --env-file=.env.vercel scripts/fotos-a-bd.ts   (otra base, por ejemplo la de Vercel)
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "@/platform/db/client";
import { DEMO_CASES } from "@/platform/db/demo-data";
import { cases, stages } from "@/platform/db/schema";

async function main() {
  const db = getDb();
  let caseRows = 0;
  let stageRows = 0;
  for (const demoCase of DEMO_CASES) {
    const [row] = await db
      .update(cases)
      .set({ photoPath: demoCase.photoPath })
      .where(eq(cases.code, demoCase.code))
      .returning({ id: cases.id });
    if (!row) {
      console.warn(`${demoCase.code} no está en la base: se omite.`);
      continue;
    }
    caseRows++;
    for (const [i, stage] of demoCase.stages.entries()) {
      const updated = await db
        .update(stages)
        .set({ photoPath: stage.photoPath ?? null })
        .where(and(eq(stages.caseId, row.id), eq(stages.position, i + 1)))
        .returning({ id: stages.id });
      stageRows += updated.length;
    }
  }
  console.log(`Fotos al día: ${caseRows} casos y ${stageRows} etapas.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
