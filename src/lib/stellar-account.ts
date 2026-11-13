const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;

/** Verifica el formato de una cuenta pública de Stellar (G… de 56 caracteres). No comprueba que exista. */
export function isStellarAccount(value: string): boolean {
  return STELLAR_ACCOUNT.test(value);
}

/** Muestra una cuenta abreviada, por ejemplo GAOK…UAUZ6. */
export function shortAccount(account: string): string {
  return account.length > 12 ? `${account.slice(0, 4)}…${account.slice(-5)}` : account;
}
