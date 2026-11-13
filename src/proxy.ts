import { NextResponse, type NextRequest } from "next/server";
import {
  CABECERA_IDIOMA,
  CABECERA_RUTA,
  COOKIE_IDIOMA,
  esIdioma,
  IDIOMA_BASE,
  prefijoDeRuta,
  quitarIdioma,
  type Idioma,
} from "@/i18n/config";

const UN_ANIO = 60 * 60 * 24 * 365;

function recordar(respuesta: NextResponse, idioma: Idioma): NextResponse {
  respuesta.cookies.set(COOKIE_IDIOMA, idioma, { path: "/", maxAge: UN_ANIO, sameSite: "lax" });
  return respuesta;
}

/**
 * Rutas por idioma, como kiba.tools: español sin prefijo, `/en/...` y `/pt/...` para inglés y portugués.
 * - `/en/casos/POW_001` se sirve desde `/casos/POW_001` con la cabecera del idioma, y se recuerda en una cookie.
 * - `/es/...` guarda el español y redirige a la ruta sin prefijo (es el enlace «ES» del selector).
 * - Una ruta sin prefijo con la cookie en otro idioma redirige a ese idioma, así un enlace que se quedó sin prefijo no
 *   devuelve a nadie al español.
 * - `/api` no lleva prefijo: toma el idioma de la cookie para que sus mensajes salgan en el idioma de la página.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cabeceras = new Headers(request.headers);
  const prefijo = prefijoDeRuta(pathname);

  if (prefijo === IDIOMA_BASE) {
    const destino = request.nextUrl.clone();
    destino.pathname = quitarIdioma(pathname);
    return recordar(NextResponse.redirect(destino), IDIOMA_BASE);
  }

  if (prefijo) {
    const destino = request.nextUrl.clone();
    destino.pathname = quitarIdioma(pathname);
    cabeceras.set(CABECERA_IDIOMA, prefijo);
    cabeceras.set(CABECERA_RUTA, destino.pathname);
    const respuesta = NextResponse.rewrite(destino, { request: { headers: cabeceras } });
    return request.cookies.get(COOKIE_IDIOMA)?.value === prefijo ? respuesta : recordar(respuesta, prefijo);
  }

  const elegido = request.cookies.get(COOKIE_IDIOMA)?.value;
  const preferido = esIdioma(elegido) ? elegido : IDIOMA_BASE;

  if (pathname.startsWith("/api/")) {
    cabeceras.set(CABECERA_IDIOMA, preferido);
    return NextResponse.next({ request: { headers: cabeceras } });
  }

  if (preferido !== IDIOMA_BASE && (request.method === "GET" || request.method === "HEAD")) {
    const destino = request.nextUrl.clone();
    destino.pathname = `/${preferido}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(destino);
  }

  cabeceras.set(CABECERA_IDIOMA, IDIOMA_BASE);
  cabeceras.set(CABECERA_RUTA, pathname);
  return NextResponse.next({ request: { headers: cabeceras } });
}

export const config = {
  // Páginas y API; no los recursos de Next ni los archivos con extensión (fotos, íconos, evidencias).
  matcher: ["/((?!_next/|__nextjs|.*\\.[A-Za-z0-9]+$).*)"],
};
