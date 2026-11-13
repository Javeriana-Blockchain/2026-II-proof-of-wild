import type { Idioma } from "../config";
import { casos } from "./casos";
import { comun } from "./comun";
import { cuenta } from "./cuenta";
import { errores } from "./errores";
import { huella } from "./huella";
import { inicio } from "./inicio";
import { ong } from "./ong";

/**
 * Todos los textos de la interfaz, por idioma. Cada área vive en su archivo (`comun`, `inicio`, `casos`, `cuenta`,
 * `ong`, `huella`, `errores`) y sus claves empiezan por el nombre del área, así no se pisan. Solo lo importa el servidor:
 * el navegador recibe los textos de su idioma por el `ProveedorIdioma`.
 */
const es = { ...comun.es, ...inicio.es, ...casos.es, ...cuenta.es, ...ong.es, ...huella.es, ...errores.es };

export type Clave = keyof typeof es;
export type Mensajes = Record<Clave, string>;

export const MENSAJES: Record<Idioma, Mensajes> = {
  es,
  en: { ...comun.en, ...inicio.en, ...casos.en, ...cuenta.en, ...ong.en, ...huella.en, ...errores.en },
  pt: { ...comun.pt, ...inicio.pt, ...casos.pt, ...cuenta.pt, ...ong.pt, ...huella.pt, ...errores.pt },
};
