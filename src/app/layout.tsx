import type { Metadata } from "next";
import { Archivo, Zilla_Slab } from "next/font/google";
import type { ReactNode } from "react";
import { WalletProvider } from "@/components/billetera/WalletProvider";
import "./globals.css";

/** Títulos en Zilla Slab (la slab de un letrero de parque); texto y rótulos en Archivo, con su eje de ancho. */
const display = Zilla_Slab({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-zilla",
  display: "swap",
});
const sans = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Proof of Wild", template: "%s · Proof of Wild" },
  description:
    "Apadrina a un animal rescatado y sigue cada paso de su recuperación. Todo queda registrado en Stellar y lo puedes verificar.",
};

/**
 * Activa la aparición al hacer scroll antes de pintar, para que nada parpadee. Sin JavaScript no corre y el contenido
 * se queda visible.
 */
const REVEAL_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&"IntersectionObserver"in window)document.documentElement.dataset.reveal="on"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
