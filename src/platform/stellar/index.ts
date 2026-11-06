import { getStellarEnv } from "@/platform/config/env";
import { ClassicStellarAdapter } from "./classic-adapter";
import { HorizonLedgerReader } from "./ledger-reader";

/** Crea el adaptador Stellar clásico con la configuración del entorno. Lo usa la raíz de composición. */
export function createClassicStellarAdapter(): ClassicStellarAdapter {
  const env = getStellarEnv();
  return new ClassicStellarAdapter(
    {
      networkPassphrase: env.NETWORK_PASSPHRASE,
      asset: { code: env.ASSET_CODE, issuer: env.ASSET_ISSUER },
    },
    new HorizonLedgerReader(env.HORIZON_URL),
  );
}

export { ClassicStellarAdapter } from "./classic-adapter";
export { HorizonLedgerReader } from "./ledger-reader";
export type { LedgerReader } from "./ledger-reader";
