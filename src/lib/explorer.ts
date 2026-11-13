/** Enlace a una transacción en el explorador de bloques (por ejemplo Stellar Expert). */
export function explorerTxUrl(explorerBaseUrl: string, txHash: string): string {
  return `${explorerBaseUrl.replace(/\/+$/, "")}/tx/${txHash}`;
}

export function explorerAccountUrl(explorerBaseUrl: string, account: string): string {
  return `${explorerBaseUrl.replace(/\/+$/, "")}/account/${account}`;
}

export function explorerContractUrl(explorerBaseUrl: string, contractId: string): string {
  return `${explorerBaseUrl.replace(/\/+$/, "")}/contract/${contractId}`;
}
