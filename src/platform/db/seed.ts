import { getDb } from "./client";
import { seedDemo } from "./seed-data";

/** Uso: npm run db:seed [-- --with-activity]. Variables opcionales en README. */
async function main(): Promise<void> {
  const withActivity = process.argv.includes("--with-activity");
  const result = await seedDemo(getDb(), {
    withActivity,
    password: process.env.DEMO_PASSWORD,
    centerAccount: process.env.DEMO_CENTER_ACCOUNT,
    centerUserAccount: process.env.DEMO_CENTER_USER_ACCOUNT,
    validatorAccount: process.env.DEMO_VALIDATOR_ACCOUNT,
  });

  if (result.skipped) {
    console.log("La base de datos ya tiene casos; no se cargó nada.");
    return;
  }
  console.log("Se cargaron 1 centro ficticio y 3 casos (POW-001, POW-002, POW-003).");
  if (result.password) {
    console.log(`Contraseña de los usuarios de demo (anótala, no se vuelve a mostrar): ${result.password}`);
  }
  if (result.centerAccountGenerated) {
    console.warn(
      "AVISO: la cuenta Stellar del centro es aleatoria. Define DEMO_CENTER_ACCOUNT con una cuenta de testnet " +
        "fondeada y con línea de confianza del activo de prueba antes de recibir aportes.",
    );
  }
  if (withActivity) {
    console.warn("AVISO: se cargó actividad de ejemplo con hashes inventados; no existen en la red Stellar.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
