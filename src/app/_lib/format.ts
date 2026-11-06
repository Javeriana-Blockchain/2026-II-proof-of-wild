const amountFormat = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Solo para mostrar: los cálculos con dinero se hacen con stroops (`lib/amount`). */
export function formatAmount(amount: string, assetCode = "USDC"): string {
  return `${amountFormat.format(Number(amount))} ${assetCode}`;
}

/** Acepta una fecha ISO o una fecha simple AAAA-MM-DD. */
export function formatDate(value: string): string {
  return dateFormat.format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}
