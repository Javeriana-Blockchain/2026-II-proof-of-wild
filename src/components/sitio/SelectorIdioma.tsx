"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { useT } from "@/i18n/cliente";
import { IDIOMA_BASE, IDIOMAS, localizarRuta, NOMBRES_IDIOMA, quitarIdioma, type Idioma } from "@/i18n/config";

/**
 * Enlace a la misma página en otro idioma. El español va por `/es/...`: el proxy guarda la elección y redirige a la
 * ruta sin prefijo; los demás van directo a `/en/...` o `/pt/...`.
 */
function enlaceIdioma(ruta: string, idioma: Idioma): string {
  const base = quitarIdioma(ruta);
  return idioma === IDIOMA_BASE ? `/${IDIOMA_BASE}${base === "/" ? "" : base}` : localizarRuta(base, idioma);
}

/**
 * Cambiar de idioma recarga la página entera (no es una navegación del cliente) para que el menú, el pie y los textos
 * que vienen del servidor lleguen todos en el idioma nuevo. Se conservan la consulta y el ancla de la página.
 */
function useCambiarIdioma() {
  const { idioma } = useT();
  const pathname = usePathname();
  const href = (destino: Idioma) => enlaceIdioma(pathname, destino);
  const ir = (event: MouseEvent<HTMLAnchorElement>, destino: Idioma) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (destino === idioma) return;
    window.location.assign(`${href(destino)}${window.location.search}${window.location.hash}`);
  };
  return { idioma, href, ir };
}

/**
 * Selector de idioma, como el de kiba.tools: ES · EN · PT en una placa, con el idioma actual en bosque.
 * `variante="menu"` es la versión compacta para cuando el menú no tiene espacio: un botón con el idioma actual que
 * despliega los tres.
 */
export function SelectorIdioma({ variante = "placa" }: { variante?: "placa" | "menu" }) {
  return variante === "menu" ? <MenuIdioma /> : <PlacaIdioma />;
}

function PlacaIdioma() {
  const { t } = useT();
  const { idioma, href, ir } = useCambiarIdioma();
  return (
    <div
      role="group"
      aria-label={t("comun.idioma.grupo")}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-xl bg-white/80 p-1 ring-1 ring-arena"
    >
      {IDIOMAS.map((l) => {
        const actual = l === idioma;
        return (
          <a
            key={l}
            href={href(l)}
            hrefLang={l}
            lang={l}
            onClick={(event) => ir(event, l)}
            aria-current={actual ? "true" : undefined}
            aria-label={actual ? NOMBRES_IDIOMA[l].nombre : t("comun.idioma.cambiar", { idioma: NOMBRES_IDIOMA[l].nombre })}
            title={NOMBRES_IDIOMA[l].nombre}
            className={`rotulo rounded-lg px-2.5 py-1.5 leading-none transition-colors duration-200 ${actual ? "bg-bosque text-white" : "text-secundario hover:bg-crema hover:text-bosque"}`}
          >
            {NOMBRES_IDIOMA[l].corto}
          </a>
        );
      })}
    </div>
  );
}

function MenuIdioma() {
  const { t } = useT();
  const { idioma, href, ir } = useCambiarIdioma();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!abierto) return;
    const fuera = (event: PointerEvent) => {
      if (!raiz.current?.contains(event.target as Node)) setAbierto(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={id}
        aria-label={`${t("comun.idioma.grupo")}: ${NOMBRES_IDIOMA[idioma].nombre}`}
        className="rotulo inline-flex cursor-pointer items-center gap-1 rounded-xl bg-white/80 px-2.5 py-2 leading-none text-texto ring-1 ring-arena transition-colors hover:text-bosque"
      >
        {NOMBRES_IDIOMA[idioma].corto}
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={`h-3.5 w-3.5 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {abierto ? (
        <ul
          id={id}
          className="anim-ventana absolute top-full right-0 z-50 mt-2 min-w-36 rounded-xl bg-white p-1 ring-1 ring-arena"
        >
          {IDIOMAS.map((l) => {
            const actual = l === idioma;
            return (
              <li key={l}>
                <a
                  href={href(l)}
                  hrefLang={l}
                  lang={l}
                  onClick={(event) => ir(event, l)}
                  aria-current={actual ? "true" : undefined}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-semibold transition-colors ${actual ? "bg-bosque text-white" : "text-texto hover:bg-crema hover:text-bosque"}`}
                >
                  {NOMBRES_IDIOMA[l].nombre}
                  <span className="rotulo opacity-70">{NOMBRES_IDIOMA[l].corto}</span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
