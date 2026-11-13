import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { CABECERA_IDIOMA, CABECERA_RUTA, COOKIE_IDIOMA, esIdioma, IDIOMA_BASE, IDIOMAS, LANG_HTML, localizarRuta, type Idioma } from "./config";
import { MENSAJES } from "./mensajes";
import { crearTraductor, type Traductor } from "./traductor";

/**
 * Idioma de esta petición. Lo pone el proxy (`src/proxy.ts`) a partir del prefijo de la ruta; en `/api` viene de la
 * cookie del idioma elegido. Sirve en páginas, layouts, `generateMetadata`, acciones de servidor y rutas de API.
 * Las peticiones que el proxy no ve (archivos con extensión, como `/api/evidencias/x.pdf`) toman la cookie.
 */
export const getIdioma = cache(async (): Promise<Idioma> => {
  const valor = (await headers()).get(CABECERA_IDIOMA);
  if (esIdioma(valor)) return valor;
  const elegido = (await cookies()).get(COOKIE_IDIOMA)?.value;
  return esIdioma(elegido) ? elegido : IDIOMA_BASE;
});

/** Traductor del idioma de la petición. En un componente de servidor: `const { t, ruta } = await getT();`. */
export const getT = cache(async (): Promise<Traductor> => {
  const idioma = await getIdioma();
  return crearTraductor(idioma, MENSAJES[idioma]);
});

/** La misma página en cada idioma, para `alternates.languages` (`hreflang`). El español es también el predeterminado. */
export async function getAlternativas(): Promise<Record<string, string>> {
  const ruta = (await headers()).get(CABECERA_RUTA) ?? "/";
  const alternativas: Record<string, string> = { "x-default": ruta };
  for (const idioma of IDIOMAS) alternativas[LANG_HTML[idioma]] = localizarRuta(ruta, idioma);
  return alternativas;
}

/** `redirect` a una ruta interna en el idioma de la petición. */
export async function redirigir(destino: string): Promise<never> {
  redirect((await getT()).ruta(destino));
}
