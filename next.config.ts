import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // sharp es un paquete nativo: se carga desde node_modules, no se empaqueta.
  serverExternalPackages: ["sharp"],
  /**
   * La biometría (ADR-21) corre solo en el navegador. Sin este alias, al prerenderizar se resuelve la versión para
   * Node de `@vladmandic/human`, que pide `@tensorflow/tfjs-node`.
   */
  turbopack: {
    resolveAlias: { "@vladmandic/human": "./node_modules/@vladmandic/human/dist/human.esm.js" },
  },
  /**
   * Casos, Cómo funciona y Voluntariados son secciones de la página principal. Los enlaces viejos redirigen en el
   * servidor, así el navegador baja a la sección; `?inscribirme=<id>` sigue abriendo la inscripción a una jornada.
   * Las redirecciones corren antes que el proxy de idiomas, por eso cada una va también con `/en` y `/pt`.
   */
  async redirects() {
    const secciones = (prefijo: string) => [
      { source: `${prefijo}/casos`, destination: `${prefijo || "/"}#casos`, permanent: false },
      { source: `${prefijo}/como-funciona`, destination: `${prefijo || "/"}#como-funciona`, permanent: false },
      {
        source: `${prefijo}/voluntariados`,
        has: [{ type: "query" as const, key: "inscribirme", value: "(?<id>[0-9a-fA-F-]{36})" }],
        destination: `${prefijo || "/"}?inscribirme=:id#voluntariados`,
        permanent: false,
      },
      { source: `${prefijo}/voluntariados`, destination: `${prefijo || "/"}#voluntariados`, permanent: false },
    ];
    return [...secciones(""), ...secciones("/en"), ...secciones("/pt")];
  },
};

export default nextConfig;
