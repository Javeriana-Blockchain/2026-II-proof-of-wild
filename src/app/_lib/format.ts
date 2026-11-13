import { IDIOMA_BASE, LOCALE_INTL, type Idioma } from "@/i18n/config";

/**
 * Formatos de cifras y fechas en el idioma de la página. En los componentes se usan las versiones que trae el
 * traductor (`const { formatAmount } = await getT()` o `useT()`), que ya saben el idioma.
 */
type Formatos = {
  amount: Intl.NumberFormat;
  longDate: Intl.DateTimeFormat;
  dayMonth: Intl.DateTimeFormat;
  monthYear: Intl.DateTimeFormat;
};

const porIdioma = new Map<Idioma, Formatos>();

function formatos(idioma: Idioma): Formatos {
  let f = porIdioma.get(idioma);
  if (!f) {
    const locale = LOCALE_INTL[idioma];
    f = {
      amount: new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
      longDate: new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      dayMonth: new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }),
      monthYear: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    };
    porIdioma.set(idioma, f);
  }
  return f;
}

/** Solo para mostrar: los cálculos con dinero se hacen con stroops (`lib/amount`). «150 USDC», «25,5 USDC». */
export function formatAmount(amount: string, assetCode = "USDC", idioma: Idioma = IDIOMA_BASE): string {
  return `${formatos(idioma).amount.format(Number(amount))} ${assetCode}`;
}

function toDate(value: string): Date {
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
}

/** «20 de octubre de 2026» / «October 20, 2026». Acepta una fecha ISO o AAAA-MM-DD. */
export function formatDate(value: string, idioma: Idioma = IDIOMA_BASE): string {
  return formatos(idioma).longDate.format(toDate(value));
}

/** «13 nov 2026» / «Nov 13, 2026», para tablas. */
export function formatShortDate(value: string, idioma: Idioma = IDIOMA_BASE): string {
  const d = toDate(value);
  const locale = LOCALE_INTL[idioma];
  if (idioma === "en") return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const month = d.toLocaleString(locale, { month: "short", timeZone: "UTC" }).replace(".", "");
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

/** «13 de diciembre» / «December 13». */
export function formatDayMonth(value: string, idioma: Idioma = IDIOMA_BASE): string {
  return formatos(idioma).dayMonth.format(toDate(value));
}

/** «octubre de 2026» / «October 2026». */
export function formatMonthYear(value: string, idioma: Idioma = IDIOMA_BASE): string {
  return formatos(idioma).monthYear.format(toDate(value));
}
