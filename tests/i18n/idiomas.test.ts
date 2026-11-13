import { createElement, isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { localizarRuta, prefijoDeRuta, quitarIdioma } from "@/i18n/config";
import { MENSAJES } from "@/i18n/mensajes";
import { crearTraductor } from "@/i18n/traductor";

describe("rutas por idioma", () => {
  it("reconoce y quita el prefijo de idioma", () => {
    expect(prefijoDeRuta("/en/casos/POW_001")).toBe("en");
    expect(prefijoDeRuta("/pt")).toBe("pt");
    expect(prefijoDeRuta("/casos/POW_001")).toBeNull();
    expect(prefijoDeRuta("/entrar")).toBeNull();
    expect(quitarIdioma("/en/casos/POW_001")).toBe("/casos/POW_001");
    expect(quitarIdioma("/pt")).toBe("/");
    expect(quitarIdioma("/es/ong/registro")).toBe("/ong/registro");
    expect(quitarIdioma("/casos/POW_001")).toBe("/casos/POW_001");
  });

  it("lleva una ruta interna a cada idioma, con su consulta y su ancla", () => {
    expect(localizarRuta("/casos/POW_001", "en")).toBe("/en/casos/POW_001");
    expect(localizarRuta("/casos/POW_001", "es")).toBe("/casos/POW_001");
    expect(localizarRuta("/", "pt")).toBe("/pt");
    expect(localizarRuta("/#casos", "en")).toBe("/en#casos");
    expect(localizarRuta("/?inscribirme=abc#voluntariados", "pt")).toBe("/pt?inscribirme=abc#voluntariados");
    expect(localizarRuta("/ingresar?modo=ingresar&volver=%2Fperfil", "en")).toBe(
      "/en/ingresar?modo=ingresar&volver=%2Fperfil",
    );
  });

  it("no duplica el prefijo y cambia de un idioma a otro", () => {
    expect(localizarRuta("/en/perfil", "en")).toBe("/en/perfil");
    expect(localizarRuta("/en/perfil", "pt")).toBe("/pt/perfil");
    expect(localizarRuta("/pt/perfil", "es")).toBe("/perfil");
  });

  it("deja igual las direcciones externas, la API y los archivos", () => {
    expect(localizarRuta("https://stellar.expert/explorer/testnet", "en")).toBe("https://stellar.expert/explorer/testnet");
    expect(localizarRuta("//cdn.example/x", "en")).toBe("//cdn.example/x");
    expect(localizarRuta("/api/aportes/preparar", "en")).toBe("/api/aportes/preparar");
    expect(localizarRuta("/fotos/lorito.webp", "pt")).toBe("/fotos/lorito.webp");
    expect(localizarRuta("#casos", "en")).toBe("#casos");
  });
});

describe("traductor", () => {
  const en = crearTraductor("en", MENSAJES.en);
  const es = crearTraductor("es", MENSAJES.es);

  it("traduce y sustituye valores", () => {
    expect(es.t("comun.nav.casos")).toBe("Casos");
    expect(en.t("comun.nav.casos")).toBe("Cases");
    expect(en.t("comun.idioma.cambiar", { idioma: "Português" })).toBe("View this page in Português");
  });

  it("elige la forma singular o plural y formatea la cantidad", () => {
    expect(es.tn("inicio.casos.recuperados", 1)).toBe("1 recuperado");
    expect(es.tn("inicio.casos.recuperados", 3)).toBe("3 recuperados");
    expect(en.tn("inicio.casos.recuperados", 1200)).toBe("1,200 recovered");
  });

  it("arma texto enriquecido con las piezas de cada etiqueta", () => {
    const nodos = en.rich("inicio.vol.ocupados", { b: (s) => createElement("strong", null, s) }, { ocupados: 3, cupos: 10 });
    expect(Array.isArray(nodos)).toBe(true);
    const [primero, resto] = nodos as ReactElement<{ children: ReactElement<{ children: string }> }>[];
    expect(isValidElement(primero)).toBe(true);
    expect(primero.props.children.type).toBe("strong");
    expect(primero.props.children.props.children).toBe("3");
    expect(resto).toBe(" of 10 spots taken");
  });

  it("formatea cifras y fechas en el idioma", () => {
    expect(es.formatAmount("1500.5")).toBe("1.500,5 USDC");
    expect(en.formatAmount("1500.5")).toBe("1,500.5 USDC");
    expect(en.formatDate("2026-10-20")).toBe("October 20, 2026");
    expect(crearTraductor("pt", MENSAJES.pt).formatDate("2026-10-20")).toBe("20 de outubro de 2026");
    expect(es.ruta("/perfil")).toBe("/perfil");
    expect(en.ruta("/perfil")).toBe("/en/perfil");
  });
});

describe("diccionarios", () => {
  it("los tres idiomas tienen las mismas claves y ningún texto vacío", () => {
    const claves = Object.keys(MENSAJES.es).sort();
    for (const idioma of ["en", "pt"] as const) {
      expect(Object.keys(MENSAJES[idioma]).sort()).toEqual(claves);
    }
    for (const idioma of ["es", "en", "pt"] as const) {
      const vacias = Object.entries(MENSAJES[idioma]).filter(([, texto]) => texto.trim() === "");
      expect(vacias).toEqual([]);
    }
  });

  it("las traducciones conservan los mismos valores {…} y etiquetas <…> que el español", () => {
    const marcas = (texto: string) => [...texto.matchAll(/\{\w+\}|<\/?\w+>/g)].map((m) => m[0]).sort();
    const distintas: string[] = [];
    for (const [clave, texto] of Object.entries(MENSAJES.es)) {
      for (const idioma of ["en", "pt"] as const) {
        const traducido = MENSAJES[idioma][clave as keyof typeof MENSAJES.es];
        if (marcas(traducido).join() !== marcas(texto).join()) distintas.push(`${idioma}:${clave}`);
      }
    }
    expect(distintas).toEqual([]);
  });
});
