"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/components/billetera/WalletProvider";
import { buttonClass, Spinner } from "@/components/ui";
import { unlinkWallet } from "./actions";

/** Desconecta la billetera de este navegador y la desvincula del perfil. Va sobre la cabecera oscura. */
export function DisconnectButton() {
  const router = useRouter();
  const { disconnect } = useWallet();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await Promise.all([unlinkWallet(), disconnect()]);
        router.refresh();
        setBusy(false);
      }}
      className={buttonClass("contorno", "disabled:border-white/30 disabled:bg-transparent disabled:text-white/60")}
    >
      {busy ? <Spinner /> : null}
      Desconectar billetera
    </button>
  );
}
