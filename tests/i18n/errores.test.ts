import { describe, expect, it } from "vitest";
import { traducirError } from "@/i18n/errores";
import { MENSAJES } from "@/i18n/mensajes";
import { errores } from "@/i18n/mensajes/errores";
import { crearTraductor } from "@/i18n/traductor";

const t = {
  es: crearTraductor("es", MENSAJES.es).t,
  en: crearTraductor("en", MENSAJES.en).t,
  pt: crearTraductor("pt", MENSAJES.pt).t,
};

const datos = (texto: string) => [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("traducción de errores del dominio", () => {
  it("traduce un mensaje fijo", () => {
    const mensaje = "No existe ese caso.";
    expect(traducirError(mensaje, t.en)).toBe("That case doesn't exist.");
    expect(traducirError(mensaje, t.pt)).toBe("Esse caso não existe.");
    expect(traducirError(mensaje, t.es)).toBe(mensaje);
  });

  it("traduce un mensaje con datos y conserva los valores", () => {
    const mensaje = "La etapa 2 solo tiene 12.5 USDC cubiertos y sin gastar.";
    expect(traducirError(mensaje, t.en)).toBe("Stage 2 only has 12.5 USDC covered and unspent.");
    expect(traducirError(mensaje, t.pt)).toBe("A etapa 2 só tem 12.5 USDC cobertos e não gastos.");
    expect(traducirError(mensaje, t.es)).toBe(mensaje);
    expect(traducirError("La red rechazó la transacción (txBadSeq).", t.en)).toBe(
      "The network rejected the transaction (txBadSeq).",
    );
  });

  it("devuelve igual un mensaje que no conoce", () => {
    expect(traducirError("Un error que nadie catalogó.", t.en)).toBe("Un error que nadie catalogó.");
    expect(traducirError("", t.pt)).toBe("");
  });

  it("no confunde un mensaje fijo con uno parecido", () => {
    expect(traducirError("No existe ese caso", t.en)).toBe("No existe ese caso");
  });
});

describe("diccionario de errores", () => {
  const claves = Object.keys(errores.es) as Array<keyof typeof errores.es>;

  it("tiene cada clave en inglés y portugués, con los mismos datos", () => {
    for (const idioma of ["en", "pt"] as const) {
      expect(Object.keys(errores[idioma]).sort()).toEqual([...claves].sort());
      for (const clave of claves) {
        const traduccion = errores[idioma][clave];
        expect(traduccion.trim(), `${idioma}: ${clave}`).not.toBe("");
        expect(datos(traduccion), `${idioma}: ${clave}`).toEqual(datos(errores.es[clave]));
        expect(MENSAJES[idioma][clave]).toBe(traduccion);
      }
    }
  });

  it("no repite textos en español, así cada mensaje tiene una sola clave", () => {
    const textos = Object.values(errores.es);
    expect(new Set(textos).size).toBe(textos.length);
  });

  it("reconoce cada mensaje del diccionario", () => {
    for (const clave of claves) {
      const ejemplo = errores.es[clave].replace(/\{(\w+)\}/g, "X");
      const esperado = errores.en[clave].replace(/\{(\w+)\}/g, "X");
      expect(traducirError(ejemplo, t.en), clave).toBe(esperado);
    }
  });
});
