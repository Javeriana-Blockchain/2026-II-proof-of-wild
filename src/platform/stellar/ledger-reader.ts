import { Horizon } from "@stellar/stellar-sdk";
import {
  AccountNotFoundError,
  LedgerError,
  LedgerUnavailableError,
  TransactionNotFoundError,
} from "@/ports/errors";

export interface BalanceLine {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

export interface LoadedAccount {
  accountId: string;
  sequence: string;
  balances: BalanceLine[];
}

export interface TransactionRecord {
  successful: boolean;
  source_account: string;
  created_at: string;
  memo_type: string;
  /** Texto para memos de texto; base64 para memos de hash. */
  memo?: string;
}

export interface OperationRecord {
  type: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
}

/** Lo mínimo que el adaptador necesita de Horizon. Permite probarlo sin red. */
export interface LedgerReader {
  loadAccount(accountId: string): Promise<LoadedAccount>;
  getTransaction(txHash: string): Promise<TransactionRecord>;
  getOperations(txHash: string): Promise<OperationRecord[]>;
}

function statusOf(error: unknown): number | undefined {
  const response = (error as { response?: { status?: number } } | null)?.response;
  return response?.status;
}

function translate(error: unknown, what: string, notFound: new (m: string, o?: { cause?: unknown }) => LedgerError) {
  if (error instanceof LedgerError) return error;
  if (statusOf(error) === 404 || (error as { name?: string } | null)?.name === "NotFoundError") {
    return new notFound(`No se encontró ${what} en la red.`, { cause: error });
  }
  return new LedgerUnavailableError(`La red no respondió al consultar ${what}.`, { cause: error });
}

/** Lector real: consulta Horizon (testnet en el MVP). */
export class HorizonLedgerReader implements LedgerReader {
  private readonly server: Horizon.Server;

  constructor(horizonUrl: string) {
    this.server = new Horizon.Server(horizonUrl);
  }

  async loadAccount(accountId: string): Promise<LoadedAccount> {
    try {
      const account = await this.server.loadAccount(accountId);
      return {
        accountId: account.accountId(),
        sequence: account.sequenceNumber(),
        balances: account.balances as BalanceLine[],
      };
    } catch (error) {
      throw translate(error, `la cuenta ${accountId}`, AccountNotFoundError);
    }
  }

  async getTransaction(txHash: string): Promise<TransactionRecord> {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      return {
        successful: tx.successful,
        source_account: tx.source_account,
        created_at: tx.created_at,
        memo_type: tx.memo_type,
        memo: "memo" in tx ? (tx.memo as string | undefined) : undefined,
      };
    } catch (error) {
      throw translate(error, `la transacción ${txHash}`, TransactionNotFoundError);
    }
  }

  async getOperations(txHash: string): Promise<OperationRecord[]> {
    try {
      const page = await this.server.operations().forTransaction(txHash).limit(200).call();
      return page.records as unknown as OperationRecord[];
    } catch (error) {
      throw translate(error, `las operaciones de ${txHash}`, TransactionNotFoundError);
    }
  }
}
