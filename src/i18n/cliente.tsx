"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Idioma } from "./config";
import { crearTraductor, type Mensajes, type Traductor } from "./traductor";

const Contexto = createContext<Traductor | null>(null);

/**
 * Pone el idioma de la página al alcance de los componentes de cliente. Lo monta el layout raíz con los textos de un
 * solo idioma, así el navegador no descarga los otros dos.
 */
export function ProveedorIdioma({ idioma, mensajes, children }: { idioma: Idioma; mensajes: Mensajes; children: ReactNode }) {
  const valor = useMemo(() => crearTraductor(idioma, mensajes), [idioma, mensajes]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Traductor en un componente de cliente: `const { t, ruta } = useT();`. */
export function useT(): Traductor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useT necesita el ProveedorIdioma del layout raíz.");
  return valor;
}
