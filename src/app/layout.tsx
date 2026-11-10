import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Proof of Wild", template: "%s · Proof of Wild" },
  description:
    "Apadrina a un animal rescatado y sigue cada paso de su recuperación. Todo queda registrado en Stellar y lo puedes verificar.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
