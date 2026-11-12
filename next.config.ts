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
   */
  async redirects() {
    return [
      { source: "/casos", destination: "/#casos", permanent: false },
      { source: "/como-funciona", destination: "/#como-funciona", permanent: false },
      {
        source: "/voluntariados",
        has: [{ type: "query", key: "inscribirme", value: "(?<id>[0-9a-fA-F-]{36})" }],
        destination: "/?inscribirme=:id#voluntariados",
        permanent: false,
      },
      { source: "/voluntariados", destination: "/#voluntariados", permanent: false },
    ];
  },
};

export default nextConfig;
