"use client";

import Link from "next/link";
import { shortAccount } from "@/lib/stellar-account";
import { useWallet } from "./WalletProvider";

/** Botón de billetera del menú: conectada, muestra la dirección abreviada y lleva al perfil de esa huella. */
export function WalletChip({ profileHref }: { profileHref: string | null }) {
  const { address } = useWallet();
  if (!address) return null;
  return (
    <Link
      href={profileHref ?? `/huella/${address}`}
      className="flex items-center gap-2 rounded-full border border-bosque bg-white px-4 py-2 font-mono text-sm font-semibold text-bosque"
      title="Billetera conectada"
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-bosque" />
      {shortAccount(address)}
    </Link>
  );
}
