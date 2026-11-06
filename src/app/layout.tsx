import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Proof of Wild",
    template: "%s · Proof of Wild",
  },
  description:
    "Apadrina la recuperación de un animal silvestre rescatado y verifica, paso a paso, en qué se usó tu aporte.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
