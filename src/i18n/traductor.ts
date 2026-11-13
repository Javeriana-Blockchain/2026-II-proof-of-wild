import { createElement, Fragment, type ReactNode } from "react";
import { formatAmount, formatDate, formatDayMonth, formatMonthYear, formatShortDate } from "@/app/_lib/format";
import { LOCALE_INTL, localizarRuta, type Idioma } from "./config";
import type { Clave, Mensajes } from "./mensajes";

export type { Clave, Mensajes } from "./mensajes";

/** Valores que se sustituyen en `{nombre}` dentro de un texto. */
export type Valores = Record<string, string | number>;

/** Claves con dos formas, `…_one` y `…_other`; `tn` elige según la cantidad. */
type BasePlural<K> = K extends `${infer Base}_one` ? Base : never;
export type ClavePlural = BasePlural<Clave>;

/** Pieza de texto enriquecido: recibe lo que va entre `<etiqueta>` y `</etiqueta>`. */
export type Pieza = (contenido: string) => ReactNode;

function interpolar(texto: string, valores?: Valores): string {
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (entero, nombre: string) =>
    nombre in valores ? String(valores[nombre]) : entero,
  );
}

/**
 * Traductor de un idioma. Es igual en el servidor (`await getT()`) y en el navegador (`useT()`):
 * - `t("clave", { n: 3 })` devuelve el texto con los valores sustituidos.
 * - `tn("clave", n)` usa `clave_one` si n = 1 y `clave_other` si no; `{n}` sale con el formato del idioma.
 * - `rich("clave", { b: (s) => <strong>{s}</strong> })` cambia `<b>…</b>` del texto por lo que devuelve la pieza.
 * - `ruta("/casos/POW_001")` lleva un enlace interno al idioma actual (`/en/casos/POW_001`).
 * - `formatAmount`, `formatDate`… son los de `app/_lib/format` con el idioma ya puesto.
 */
export function crearTraductor(idioma: Idioma, mensajes: Mensajes) {
  const locale = LOCALE_INTL[idioma];
  const numeros = new Intl.NumberFormat(locale);

  const t = (clave: Clave, valores?: Valores): string => interpolar(mensajes[clave] ?? clave, valores);

  const tn = (base: ClavePlural, n: number, valores?: Valores): string =>
    t(`${base}_${n === 1 ? "one" : "other"}` as Clave, { n: numeros.format(n), ...valores });

  const rich = (clave: Clave, piezas: Record<string, Pieza>, valores?: Valores): ReactNode => {
    const texto = t(clave, valores);
    const nodos: ReactNode[] = [];
    const patron = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let desde = 0;
    for (let m = patron.exec(texto); m; m = patron.exec(texto)) {
      if (m.index > desde) nodos.push(texto.slice(desde, m.index));
      const pieza = piezas[m[1]];
      nodos.push(createElement(Fragment, { key: nodos.length }, pieza ? pieza(m[2]) : m[2]));
      desde = m.index + m[0].length;
    }
    if (desde < texto.length) nodos.push(texto.slice(desde));
    return nodos.length === 1 ? nodos[0] : nodos;
  };

  return {
    idioma,
    locale,
    t,
    tn,
    rich,
    ruta: (destino: string): string => localizarRuta(destino, idioma),
    formatNumber: (n: number): string => numeros.format(n),
    formatAmount: (amount: string, assetCode = "USDC"): string => formatAmount(amount, assetCode, idioma),
    formatDate: (value: string): string => formatDate(value, idioma),
    formatShortDate: (value: string): string => formatShortDate(value, idioma),
    formatDayMonth: (value: string): string => formatDayMonth(value, idioma),
    formatMonthYear: (value: string): string => formatMonthYear(value, idioma),
  };
}

export type Traductor = ReturnType<typeof crearTraductor>;
