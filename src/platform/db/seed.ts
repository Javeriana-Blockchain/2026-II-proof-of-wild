import { existsSync, readFileSync } from "node:fs";
import { getDb } from "./client";
import { resetDemo, seedDemo } from "./seed-demo";
import { createEvidenceStorage } from "@/platform/storage";

/**
 * Carga los datos de prueba en la base de datos.
 *
 *   npm run db:seed                 ONG, casos con sus etapas, proveedores, donantes y voluntariados
 *   npm run db:seed:activity        lo mismo, con aportes, gastos e hitos de ejemplo (hashes inventados)
 *   … -- --reiniciar                borra todo antes de cargar (solo bases locales)
 *
 * Las cuentas de Stellar se leen de .data/cuentas-demo.json, que deja el script de preparación de la red.
 */
const ACCOUNTS_FILE = ".data/cuentas-demo.json";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const db = getDb();
  if (args.includes("--reiniciar")) {
    await resetDemo(db);
    console.log("Se borraron todos los datos.");
  }

  const accounts = existsSync(ACCOUNTS_FILE)
    ? (JSON.parse(readFileSync(ACCOUNTS_FILE, "utf8")) as { public: Record<string, string> }).public
    : undefined;
  const withActivity = args.includes("--with-activity");
  const result = await seedDemo(db, {
    password: process.env.DEMO_PASSWORD,
    accounts,
    withActivity,
    storage: withActivity ? createEvidenceStorage() : undefined,
  });

  if (result.skipped) {
    console.log("La base de datos ya tiene casos; no se cargó nada. Usa -- --reiniciar para empezar de cero.");
    return;
  }
  console.log("Se cargaron 2 ONG aprobadas, 5 proveedores, 5 casos con sus etapas y 2 voluntariados.");
  if (result.generatedPassword) {
    console.log(`Contraseña de las cuentas de demo (anótala, no se vuelve a mostrar): ${result.generatedPassword}`);
  }
  if (result.generatedAccounts.length > 0) {
    console.warn(
      `AVISO: ${result.generatedAccounts.length} cuentas de Stellar son aleatorias y no existen en la red ` +
        `(falta ${ACCOUNTS_FILE}). Sirven para ver la interfaz, no para aportar ni registrar gastos.`,
    );
  }
  if (withActivity) {
    console.warn("AVISO: la actividad de ejemplo usa hashes inventados que no existen en la red Stellar.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
