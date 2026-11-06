import type { Metadata } from "next";
import Link from "next/link";
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
      <body className="min-h-screen antialiased">
        <header className="border-b border-black/10 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">
              Proof of Wild
            </Link>
            <Link href="/portal" className="text-sm text-black/70 underline">
              Portal de centros
            </Link>
          </nav>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
