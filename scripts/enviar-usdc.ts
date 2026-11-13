/**
 * Envía USDC de prueba (el de la demo, emitido por EMISOR_USDC) a cualquier billetera de testnet, por ejemplo una de
 * Freighter o Albedo, para probar «Apadrinar» con ella.
 *
 *   npm run red:usdc -- <cuenta G…> [monto] [--esperar]
 *
 * La billetera tiene que aceptar antes este USDC (línea de confianza) y eso solo lo puede firmar su dueño. Si no la
 * tiene, el script imprime esa transacción sin firmar, lista para firmarla en Stellar Laboratory con la billetera.
 * Con --esperar queda atento hasta 15 minutos y envía el USDC apenas aparezca la línea de confianza.
 * Solo testnet: el USDC de la demo no tiene valor.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Asset, BASE_FEE, Horizon, Keypair, Operation, TimeoutInfinite, TransactionBuilder } from "@stellar/stellar-sdk";

const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const EXPLORER = process.env.EXPLORER_BASE_URL ?? "https://stellar.expert/explorer/testnet";
const ASSET_CODE = process.env.ASSET_CODE ?? "USDC";
const horizon = new Horizon.Server(HORIZON_URL);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function loadAccount(account: string) {
  try {
    return await horizon.loadAccount(account);
  } catch {
    return null;
  }
}

async function main() {
  if (!NETWORK_PASSPHRASE.startsWith("Test SDF")) fail("Este script solo corre en testnet.");
  const args = process.argv.slice(2);
  const wait = args.includes("--esperar");
  const [account, amount = "100"] = args.filter((a) => !a.startsWith("--"));
  if (!account || !/^G[A-Z2-7]{55}$/.test(account)) fail("Uso: npm run red:usdc -- <cuenta G…> [monto] [--esperar]");
  if (!/^\d+(\.\d{1,7})?$/.test(amount) || Number(amount) <= 0) fail("El monto debe ser un número positivo, por ejemplo 100.");

  const keys = JSON.parse(readFileSync(path.resolve(".data/cuentas-demo.json"), "utf8")) as {
    secret: Record<string, string>;
  };
  const issuer = Keypair.fromSecret(keys.secret.EMISOR_USDC ?? fail("Falta EMISOR_USDC en .data/cuentas-demo.json."));
  if (process.env.ASSET_ISSUER && process.env.ASSET_ISSUER !== issuer.publicKey()) {
    fail("El emisor de .data/cuentas-demo.json no es el ASSET_ISSUER de .env: corre npm run red:preparar.");
  }
  const usdc = new Asset(ASSET_CODE, issuer.publicKey());

  let dest = await loadAccount(account);
  if (!dest) {
    console.log("La cuenta no existe en testnet: la fondeo con Friendbot (XLM de prueba)…");
    const response = await fetch(`https://friendbot.stellar.org/?addr=${account}`);
    if (!response.ok) fail("Friendbot no respondió; vuelve a intentarlo en un minuto.");
    dest = (await loadAccount(account)) ?? fail("La cuenta sigue sin aparecer en testnet.");
  }

  const trusts = (a: Horizon.AccountResponse) =>
    a.balances.some((b) => "asset_code" in b && b.asset_code === ASSET_CODE && b.asset_issuer === issuer.publicKey());

  if (!trusts(dest)) {
    const xdr = new TransactionBuilder(dest, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(Operation.changeTrust({ asset: usdc }))
      .setTimeout(TimeoutInfinite)
      .build()
      .toXDR();
    console.log(`
La billetera todavía no acepta el USDC de la demo (${ASSET_CODE}:${issuer.publicKey()}).
Firma esta transacción con tu billetera para agregarlo:

  1. Abre https://lab.stellar.org/transaction/sign (red: Testnet).
  2. Pega este XDR, conecta tu billetera y firma:

${xdr}

  3. Envíala con «Submit transaction».
`);
    if (!wait) process.exit(2);
    console.log("Esperando la línea de confianza (hasta 15 minutos)…");
    const deadline = Date.now() + 15 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 10_000));
      const fresh = await loadAccount(account);
      if (fresh && trusts(fresh)) {
        dest = fresh;
        break;
      }
    }
    if (!trusts(dest)) fail("No apareció la línea de confianza en 15 minutos. Firma la transacción y corre el script otra vez.");
    console.log("Línea de confianza lista.");
  }

  const source = await horizon.loadAccount(issuer.publicKey());
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.payment({ destination: account, asset: usdc, amount }))
    .setTimeout(120)
    .build();
  tx.sign(issuer);
  const sent = await horizon.submitTransaction(tx);
  console.log(`Enviados ${amount} ${ASSET_CODE} de prueba a ${account}.`);
  console.log(`Transacción: ${EXPLORER.replace(/\/+$/, "")}/tx/${sent.hash}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
