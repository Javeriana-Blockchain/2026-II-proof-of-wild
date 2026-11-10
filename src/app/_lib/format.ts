const amountFormat = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const longDate = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });

/** Solo para mostrar: los cálculos con dinero se hacen con stroops (`lib/amount`). «150 USDC», «25,5 USDC». */
export function formatAmount(amount: string, assetCode = "USDC"): string {
  return `${amountFormat.format(Number(amount))} ${assetCode}`;
}

function toDate(value: string): Date {
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
}

/** «20 de octubre de 2026». Acepta una fecha ISO o AAAA-MM-DD. */
export function formatDate(value: string): string {
  return longDate.format(toDate(value));
}

/** «13 nov 2026», para tablas. */
export function formatShortDate(value: string): string {
  const d = toDate(value);
  const month = d.toLocaleString("es-CO", { month: "short", timeZone: "UTC" }).replace(".", "");
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

/** «13 de diciembre». */
export function formatDayMonth(value: string): string {
  return dayMonth.format(toDate(value));
}

/** «octubre de 2026». */
export function formatMonthYear(value: string): string {
  return monthYear.format(toDate(value));
}
