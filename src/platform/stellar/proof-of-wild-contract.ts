import { contract, Keypair, rpc, TransactionBuilder, xdr } from "@stellar/stellar-sdk";

/**
 * Acceso al contrato Proof of Wild (Soroban) desde el servidor y los scripts. El cliente se arma con la
 * especificación que el contrato publica en la red, así que las funciones y sus tipos son los del contrato:
 * Symbol ← string, Address ← string G…, i128 ← bigint, BytesN<32> ← Buffer, Vec<i128> ← bigint[].
 */

export interface ContractNetwork {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
}

/** Firmas de las funciones del contrato (contracts/proof-of-wild/src/lib.rs). */
export interface ProofOfWildMethods {
  inicializar(args: { admin: string; token: string }): Promise<contract.AssembledTransaction<unknown>>;
  crear_caso(args: { caso: string; ong: string; costos_etapas: bigint[] }): Promise<contract.AssembledTransaction<unknown>>;
  aportar(args: { donante: string; caso: string; monto: bigint }): Promise<contract.AssembledTransaction<unknown>>;
  registrar_gasto(args: {
    ong: string;
    caso: string;
    etapa: number;
    proveedor: string;
    monto: bigint;
    hash_factura: Buffer;
  }): Promise<contract.AssembledTransaction<unknown>>;
  registrar_hito(args: {
    ong: string;
    caso: string;
    etapa: number;
    hash_evidencia: Buffer;
  }): Promise<contract.AssembledTransaction<unknown>>;
  consultar_caso(args: { caso: string }): Promise<contract.AssembledTransaction<unknown>>;
  consultar_hito(args: { caso: string; indice: number }): Promise<contract.AssembledTransaction<unknown>>;
}

export type ProofOfWildClient = contract.Client & ProofOfWildMethods;

/** Resultado de una invocación enviada y confirmada en la red. */
export interface InvocationResult<T> {
  txHash: string;
  result: T;
  /** Fecha del ledger en que quedó la transacción. */
  ledgerCloseAt: Date;
}

let specCache: { contractId: string; spec: contract.Spec } | null = null;

/**
 * Cliente del contrato para una cuenta. Con `keypair` firma solo (scripts); sin él, solo arma y simula
 * transacciones para que las firme la billetera de la persona.
 */
export async function proofOfWildClient(
  network: ContractNetwork,
  publicKey: string,
  keypair?: Keypair,
): Promise<ProofOfWildClient> {
  const options: contract.ClientOptions = {
    contractId: network.contractId,
    networkPassphrase: network.networkPassphrase,
    rpcUrl: network.rpcUrl,
    publicKey,
    ...(keypair ? contract.basicNodeSigner(keypair, network.networkPassphrase) : {}),
  };
  if (specCache?.contractId !== network.contractId) {
    const base = await contract.Client.from(options);
    specCache = { contractId: network.contractId, spec: base.spec };
  }
  return new contract.Client(specCache.spec, options) as ProofOfWildClient;
}

/** Firma con el keypair del cliente, envía y espera la confirmación. */
export async function signAndSend<T>(tx: contract.AssembledTransaction<unknown>): Promise<InvocationResult<T>> {
  const sent = await tx.signAndSend();
  const response = sent.getTransactionResponse;
  const txHash = sent.sendTransactionResponse?.hash;
  if (!txHash || !response || response.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`La transacción no se confirmó en la red (${response?.status ?? "sin respuesta"}).`);
  }
  return { txHash, result: unwrapResult<T>(sent.result), ledgerCloseAt: new Date(response.createdAt * 1000) };
}

/**
 * Las funciones del contrato que devuelven `Result<T, Error>` llegan envueltas en Ok/Err. Devuelve el valor
 * de Ok; un Err lanza el error del contrato (por ejemplo «SuperaLaMeta»).
 */
export function unwrapResult<T>(value: unknown): T {
  if (value && typeof value === "object" && "unwrap" in value && typeof value.unwrap === "function") {
    return (value as { unwrap(): T }).unwrap();
  }
  return value as T;
}

/**
 * Envía una transacción Soroban «cruda» (subir el WASM, crear el contrato o el contrato del activo) firmada
 * por `source` y espera su resultado.
 */
export async function submitSorobanOperation(
  server: rpc.Server,
  networkPassphrase: string,
  source: Keypair,
  operation: xdr.Operation,
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const account = await server.getAccount(source.publicKey());
  const built = new TransactionBuilder(account, { fee: "1000000", networkPassphrase })
    .addOperation(operation)
    .setTimeout(120)
    .build();
  const prepared = await server.prepareTransaction(built);
  prepared.sign(source);
  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new Error(`La red rechazó la transacción ${sent.hash}: ${sent.errorResult?.toXDR("base64") ?? "sin detalle"}`);
  }
  if (sent.status === "TRY_AGAIN_LATER") {
    throw new Error("La red está ocupada; vuelve a intentarlo en unos segundos.");
  }
  const final = await server.pollTransaction(sent.hash, { attempts: 40 });
  if (final.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`La transacción ${sent.hash} terminó en estado ${final.status}.`);
  }
  return final;
}
