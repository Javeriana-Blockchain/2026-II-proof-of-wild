import { z } from "zod";

/**
 * Cada grupo de variables se valida solo cuando se usa por primera vez, de modo que una tarea
 * (por ejemplo las semillas) no exige variables que no necesita.
 */
function lazy<S extends z.ZodType>(grupo: string, schema: S) {
  let value: z.output<S> | undefined;
  return (): z.output<S> => {
    if (value === undefined) {
      const result = schema.safeParse(process.env);
      if (!result.success) {
        throw new Error(`Configuración inválida (${grupo}):\n${z.prettifyError(result.error)}`);
      }
      value = result.data;
    }
    return value;
  };
}

export const getDatabaseEnv = lazy(
  "base de datos",
  z.object({
    DATABASE_URL: z.string().min(1),
  }),
);

export const getStellarEnv = lazy(
  "Stellar",
  z.object({
    STELLAR_NETWORK: z.enum(["testnet"]).default("testnet"),
    HORIZON_URL: z.url().default("https://horizon-testnet.stellar.org"),
    NETWORK_PASSPHRASE: z.string().min(1).default("Test SDF Network ; September 2015"),
    ASSET_CODE: z.string().min(1).max(12).default("USDC"),
    ASSET_ISSUER: z.string().regex(/^G[A-Z2-7]{55}$/, "debe ser una cuenta pública de Stellar (G…)"),
  }),
);

/** Contrato Proof of Wild en Soroban. Lo escribe en .env el script `npm run red:preparar`. */
export const getContractEnv = lazy(
  "contrato",
  z.object({
    SOROBAN_RPC_URL: z.url().default("https://soroban-testnet.stellar.org"),
    NETWORK_PASSPHRASE: z.string().min(1).default("Test SDF Network ; September 2015"),
    CONTRACT_ID: z.string().regex(/^C[A-Z2-7]{55}$/, "debe ser el id del contrato (C…); corre npm run red:preparar"),
    ASSET_CODE: z.string().min(1).max(12).default("USDC"),
  }),
);

export const getExplorerEnv = lazy(
  "explorador de bloques",
  z.object({
    EXPLORER_BASE_URL: z.url().default("https://stellar.expert/explorer/testnet"),
  }),
);

export const getSessionEnv = lazy(
  "sesión",
  z.object({
    SESSION_SECRET: z.string().min(32, "debe tener al menos 32 caracteres"),
  }),
);

export const getStorageEnv = lazy(
  "almacén de evidencias",
  z.object({
    EVIDENCE_STORAGE: z.enum(["db", "local"]).default("db"),
    EVIDENCE_DIR: z.string().min(1).default("./.data/evidence"),
  }),
);

export const getJobsEnv = lazy(
  "tareas programadas",
  z.object({
    CRON_SECRET: z.string().min(16, "debe tener al menos 16 caracteres"),
  }),
);
