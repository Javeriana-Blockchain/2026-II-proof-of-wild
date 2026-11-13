import {
  Address,
  contract,
  type FeeBumpTransaction,
  rpc,
  scValToNative,
  type Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { LedgerUnavailableError, TransactionMismatchError } from "@/ports/errors";
import type {
  ContractCall,
  ContractLedger,
  InvocationStatus,
  PreparedTransaction,
} from "@/ports/contract-ledger";
import { proofOfWildClient, type ContractNetwork } from "./proof-of-wild-contract";

/** Errores del contrato (contracts/proof-of-wild/src/types.rs) en palabras para la persona. */
const CONTRACT_ERRORS: Record<number, string> = {
  3: "El monto debe ser mayor que cero.",
  4: "Ese caso no está registrado en el contrato.",
  7: "El aporte supera lo que falta para el tratamiento.",
  8: "Esa cuenta no es la de la ONG del caso.",
  9: "Esa etapa no existe en el caso.",
  10: "La etapa no tiene fondos cubiertos y sin gastar suficientes para ese gasto.",
};

/** Cuando falla la transferencia del USDC (contrato del activo), el código es el del token, no el nuestro. */
const TOKEN_ERRORS: Record<number, string> = {
  10: "Tu billetera no tiene suficiente USDC de prueba para este aporte.",
  13: "Tu billetera no tiene la línea de confianza del USDC de prueba.",
};

/** Traduce el error de una simulación a un mensaje claro. */
export function simulationMessage(error: string, fn: ContractCall["fn"]): string {
  if (/account.*not.*found|AccountNotFound|Account not found/i.test(error)) {
    return "Esa cuenta no existe en testnet. Fondéala con Friendbot y vuelve a intentarlo.";
  }
  const code = Number(/Error\(Contract, #(\d+)\)/.exec(error)?.[1]);
  if (fn === "aportar" && TOKEN_ERRORS[code] && /transfer/i.test(error)) return TOKEN_ERRORS[code];
  if (fn === "aportar" && code === 13) return TOKEN_ERRORS[13]!;
  return CONTRACT_ERRORS[code] ?? "La red no aceptó la operación. Revisa los datos e inténtalo de nuevo.";
}

function toUnits(value: unknown): bigint {
  return typeof value === "bigint" ? value : BigInt(value as number);
}

/**
 * Adaptador Soroban del contrato Proof of Wild. Arma las transacciones con la especificación que el contrato
 * publica, las simula para obtener sus recursos y lee en el RPC de Stellar lo que se confirmó.
 */
export class SorobanContractLedger implements ContractLedger {
  private readonly server: rpc.Server;

  constructor(private readonly network: ContractNetwork) {
    this.server = new rpc.Server(network.rpcUrl);
  }

  async buildContribution(input: { donor: string; caseCode: string; amountUnits: bigint }) {
    return this.build("aportar", input.donor, (c) =>
      c.aportar({ donante: input.donor, caso: input.caseCode, monto: input.amountUnits }),
    );
  }

  async buildExpense(input: {
    ngo: string;
    caseCode: string;
    stage: number;
    provider: string;
    amountUnits: bigint;
    invoiceHashHex: string;
  }) {
    return this.build("registrar_gasto", input.ngo, (c) =>
      c.registrar_gasto({
        ong: input.ngo,
        caso: input.caseCode,
        etapa: input.stage,
        proveedor: input.provider,
        monto: input.amountUnits,
        hash_factura: Buffer.from(input.invoiceHashHex, "hex"),
      }),
    );
  }

  async buildMilestone(input: { ngo: string; caseCode: string; stage: number; evidenceHashHex: string }) {
    return this.build("registrar_hito", input.ngo, (c) =>
      c.registrar_hito({
        ong: input.ngo,
        caso: input.caseCode,
        etapa: input.stage,
        hash_evidencia: Buffer.from(input.evidenceHashHex, "hex"),
      }),
    );
  }

  hashOf(signedXdr: string): string {
    return Buffer.from(this.parse(signedXdr).hash()).toString("hex");
  }

  describe(signedXdr: string): ContractCall {
    return this.describeTransaction(this.parse(signedXdr));
  }

  async submit(signedXdr: string): Promise<void> {
    let sent: rpc.Api.SendTransactionResponse;
    try {
      sent = await this.server.sendTransaction(this.parse(signedXdr));
    } catch (error) {
      throw new LedgerUnavailableError("La red no respondió al enviar la transacción.", { cause: error });
    }
    if (sent.status === "TRY_AGAIN_LATER") throw new LedgerUnavailableError("La red está ocupada; se reintentará.");
    if (sent.status === "ERROR") {
      const code = sent.errorResult?.result.type ?? "error";
      throw new TransactionMismatchError(
        code === "txBadAuth"
          ? "La firma no corresponde a la cuenta esperada. Conecta la billetera correcta."
          : `La red rechazó la transacción (${code}).`,
      );
    }
  }

  async read(txHash: string): Promise<InvocationStatus> {
    let response: rpc.Api.GetTransactionResponse;
    try {
      response = await this.server.getTransaction(txHash);
    } catch (error) {
      throw new LedgerUnavailableError("La red no respondió al leer la transacción.", { cause: error });
    }
    if (response.status === rpc.Api.GetTransactionStatus.NOT_FOUND) return { status: "pending" };
    if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
      return { status: "failed", reason: "La transacción falló en la red." };
    }
    const tx = TransactionBuilder.fromXDR(response.envelopeXdr, this.network.networkPassphrase);
    if ("innerTransaction" in tx) return { status: "failed", reason: "Transacción envuelta: no es de la página." };
    return {
      status: "success",
      call: this.describeTransaction(tx),
      returnValue: response.returnValue ? scValToNative(response.returnValue) : null,
      ledgerCloseAt: new Date(response.createdAt * 1000),
    };
  }

  private async build(
    fn: ContractCall["fn"],
    source: string,
    invoke: (client: Awaited<ReturnType<typeof proofOfWildClient>>) => Promise<contract.AssembledTransaction<unknown>>,
  ): Promise<PreparedTransaction> {
    let tx: contract.AssembledTransaction<unknown>;
    try {
      tx = await invoke(await proofOfWildClient(this.network, source));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/Error\(Contract|not found|AccountNotFound/i.test(message)) {
        throw new TransactionMismatchError(simulationMessage(message, fn));
      }
      throw new LedgerUnavailableError("La red no respondió al preparar la transacción.", { cause: error });
    }
    if (tx.simulation && rpc.Api.isSimulationError(tx.simulation)) {
      throw new TransactionMismatchError(simulationMessage(tx.simulation.error, fn));
    }
    return { xdr: tx.toXDR(), networkPassphrase: this.network.networkPassphrase };
  }

  private parse(signedXdr: string): Transaction {
    let tx: Transaction | FeeBumpTransaction;
    try {
      tx = TransactionBuilder.fromXDR(signedXdr, this.network.networkPassphrase);
    } catch {
      throw new TransactionMismatchError("La transacción firmada no es válida.");
    }
    if ("innerTransaction" in tx) throw new TransactionMismatchError("No se aceptan transacciones envueltas.");
    return tx;
  }

  private describeTransaction(tx: Transaction): ContractCall {
    const op = tx.operations[0];
    if (tx.operations.length !== 1 || op?.type !== "invokeHostFunction") {
      throw new TransactionMismatchError("La transacción no es una llamada al contrato.");
    }
    const func: xdr.HostFunction = op.func;
    if (func.type !== "hostFunctionTypeInvokeContract") {
      throw new TransactionMismatchError("La transacción no es una llamada al contrato.");
    }
    const invoke = func.invokeContract;
    if (Address.fromScAddress(invoke.contractAddress).toString() !== this.network.contractId) {
      throw new TransactionMismatchError("La transacción no es para el contrato de Proof of Wild.");
    }
    const fn = invoke.functionName.toString();
    const a = invoke.args.map((arg: xdr.ScVal) => scValToNative(arg) as unknown);
    const source = tx.source;
    const hex = (v: unknown) => Buffer.from(v as Uint8Array).toString("hex");

    switch (fn) {
      case "aportar":
        return { fn, source, donante: String(a[0]), caso: String(a[1]), monto: toUnits(a[2]) };
      case "registrar_gasto":
        return {
          fn,
          source,
          ong: String(a[0]),
          caso: String(a[1]),
          etapa: Number(a[2]),
          proveedor: String(a[3]),
          monto: toUnits(a[4]),
          hashFactura: hex(a[5]),
        };
      case "registrar_hito":
        return { fn, source, ong: String(a[0]), caso: String(a[1]), etapa: Number(a[2]), hashEvidencia: hex(a[3]) };
      default:
        throw new TransactionMismatchError(`La función «${fn}» no se acepta desde la página.`);
    }
  }
}
