"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/components/billetera/WalletProvider";
import { buttonClass } from "@/components/ui";
import { unlinkWallet } from "./actions";

/** Desconecta la billetera de este navegador y la desvincula del perfil. */
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
      className={buttonClass("secundario", "w-full py-2")}
    >
      Desconectar billetera
    </button>
  );
}
