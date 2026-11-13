import { erroresEs } from "./mensajes/errores";
import type { Traductor } from "./traductor";

/**
 * Los módulos de dominio y los adaptadores lanzan sus errores en español y no saben nada de idiomas (las pruebas
 * comprueban esos textos). Aquí, en el borde de la presentación, se reconoce el mensaje y se cambia por su clave
 * `errores.*`. Las dos tablas salen del diccionario español, así los textos no se repiten:
 * - mensajes fijos: el texto exacto → su clave;
 * - mensajes con datos (`La etapa {etapa} solo tiene {monto} USDC…`): la plantilla se vuelve un patrón con un grupo
 *   con nombre por cada `{dato}`, y lo capturado se pasa tal cual a la traducción.
 */
type ClaveError = keyof typeof erroresEs;

const DATO = /\{(\w+)\}/;

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `La función «{funcion}» no…` → `/^La función «(?<funcion>.+?)» no…$/`. */
function patronDe(plantilla: string): RegExp {
  // Con un grupo en el separador, `split` deja los textos fijos en las posiciones pares y los nombres en las impares.
  const partes = plantilla.split(new RegExp(DATO.source, "g"));
  return new RegExp(`^${partes.map((parte, i) => (i % 2 ? `(?<${parte}>.+?)` : escapar(parte))).join("")}$`);
}

const FIJOS = new Map<string, ClaveError>();
const PATRONES: Array<[RegExp, ClaveError]> = [];

for (const [clave, texto] of Object.entries(erroresEs) as Array<[ClaveError, string]>) {
  if (DATO.test(texto)) PATRONES.push([patronDe(texto), clave]);
  else FIJOS.set(texto, clave);
}

/**
 * Traduce un mensaje de error que viene del dominio o de la plataforma (siempre en español) al idioma del
 * traductor. Si no lo reconoce, lo devuelve igual.
 */
export function traducirError(mensaje: string, t: Traductor["t"]): string {
  const fija = FIJOS.get(mensaje);
  if (fija) return t(fija);
  for (const [patron, clave] of PATRONES) {
    const encontrado = patron.exec(mensaje);
    if (encontrado) return t(clave, encontrado.groups);
  }
  return mensaje;
}
