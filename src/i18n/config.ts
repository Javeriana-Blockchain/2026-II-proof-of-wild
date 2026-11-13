/**
 * Idiomas de la plataforma. Como en kiba.tools: el idioma base va sin prefijo (`/casos/POW_001`) y los demás con
 * prefijo (`/en/casos/POW_001`, `/pt/casos/POW_001`). El proxy quita el prefijo, guarda el idioma en una cookie y se
 * lo pasa a la página en una cabecera. Este archivo no depende de React ni de Next: lo usan el proxy, el servidor y
 * el navegador.
 */
export const IDIOMAS = ["es", "en", "pt"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_BASE: Idioma = "es";

/** Idioma elegido la última vez; si llega una ruta sin prefijo y la cookie dice otro idioma, se redirige. */
export const COOKIE_IDIOMA = "pow-idioma";
/** Cabecera interna con la que el proxy le dice a la página en qué idioma pintar. */
export const CABECERA_IDIOMA = "x-pow-idioma";
/** Cabecera interna con la ruta sin prefijo, para enlazar la misma página en los otros idiomas (`hreflang`). */
export const CABECERA_RUTA = "x-pow-ruta";

/** Rótulo del selector y nombre del idioma en su propio idioma. */
export const NOMBRES_IDIOMA: Record<Idioma, { corto: string; nombre: string }> = {
  es: { corto: "ES", nombre: "Español" },
  en: { corto: "EN", nombre: "English" },
  pt: { corto: "PT", nombre: "Português" },
};

/** Configuración regional para fechas y números. */
export const LOCALE_INTL: Record<Idioma, string> = { es: "es-CO", en: "en-US", pt: "pt-BR" };
/** Valor de `<html lang>` y de `hreflang`. */
export const LANG_HTML: Record<Idioma, string> = { es: "es", en: "en", pt: "pt-BR" };
/** Locale de Open Graph. */
export const LOCALE_OG: Record<Idioma, string> = { es: "es_CO", en: "en_US", pt: "pt_BR" };

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === "string" && (IDIOMAS as readonly string[]).includes(valor);
}

/** Idioma que indica el primer segmento de la ruta (`/en/...`), o nulo si no lleva prefijo. */
export function prefijoDeRuta(pathname: string): Idioma | null {
  const segmento = pathname.split("/")[1];
  return esIdioma(segmento) ? segmento : null;
}

/** La ruta sin el prefijo de idioma; siempre empieza con «/». */
export function quitarIdioma(pathname: string): string {
  const prefijo = prefijoDeRuta(pathname);
  if (!prefijo) return pathname || "/";
  return pathname.slice(prefijo.length + 1) || "/";
}

/**
 * Lleva una ruta interna al idioma pedido: `localizarRuta("/casos/POW_001", "en")` → `/en/casos/POW_001`,
 * `localizarRuta("/#casos", "pt")` → `/pt#casos`. Las direcciones externas, `/api` y los archivos se dejan igual.
 */
export function localizarRuta(ruta: string, idioma: Idioma): string {
  if (!ruta.startsWith("/") || ruta.startsWith("//")) return ruta;
  const corte = ruta.search(/[?#]/);
  const camino = corte === -1 ? ruta : ruta.slice(0, corte);
  const resto = corte === -1 ? "" : ruta.slice(corte);
  if (camino.startsWith("/api/") || camino.startsWith("/_next/") || /\.[a-z0-9]+$/i.test(camino)) return ruta;
  const base = quitarIdioma(camino);
  if (idioma === IDIOMA_BASE) return `${base}${resto}`;
  return `/${idioma}${base === "/" ? "" : base}${resto}`;
}
