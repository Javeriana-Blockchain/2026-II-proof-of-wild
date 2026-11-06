import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // sharp es un paquete nativo: se carga desde node_modules, no se empaqueta.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
