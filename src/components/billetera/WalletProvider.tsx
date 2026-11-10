"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Billetera de Stellar del navegador. Usa Stellar Wallets Kit (Varial/Freighter, xBull, Albedo, Lobstr, Hana…)
 * y lo carga solo cuando la persona conecta o firma, para no hacer más pesada cada página. La dirección se
 * recuerda en este navegador; nunca se guarda ninguna llave: la billetera firma.
 */

type Kit = typeof import("@creit.tech/stellar-wallets-kit/sdk").StellarWalletsKit;

const STORAGE_KEY = "pow-billetera";
/** Billeteras de Stellar que se ofrecen (Varial es el nuevo nombre de Freighter). */
const WALLETS = new Set(["varial", "xbull", "albedo", "lobstr", "hana", "rabet"]);
let kitPromise: Promise<Kit> | null = null;

function loadKit(selectedWalletId?: string): Promise<Kit> {
  kitPromise ??= (async () => {
    const [{ StellarWalletsKit }, { defaultModules }, { Networks }] = await Promise.all([
      import("@creit.tech/stellar-wallets-kit/sdk"),
      import("@creit.tech/stellar-wallets-kit/modules/utils"),
      import("@creit.tech/stellar-wallets-kit/types"),
    ]);
    StellarWalletsKit.init({
      modules: defaultModules({ filterBy: (m) => WALLETS.has(m.productId) }),
      network: Networks.TESTNET,
      selectedWalletId,
    });
    return StellarWalletsKit;
  })();
  return kitPromise;
}

interface Stored {
  address: string;
  walletId?: string;
}

interface WalletContextValue {
  address: string | null;
  /** Abre el selector de billeteras y devuelve la dirección conectada. */
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  /** Firma una transacción con la billetera conectada (la conecta si hace falta). */
  sign(xdr: string, networkPassphrase: string): Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/** Convierte los errores de las billeteras en mensajes claros para la persona. */
export function walletErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : typeof error === "object" ? JSON.stringify(error) : String(error);
  if (/reject|denied|declined|cancel|closed/i.test(text)) return "La firma fue rechazada. No se envió nada.";
  if (/network/i.test(text)) return "Cambia tu billetera a la red de pruebas (Testnet) e inténtalo de nuevo.";
  if (/not installed|not available|no wallet/i.test(text)) return "No encontramos esa billetera en este navegador.";
  return "No pudimos usar la billetera. Inténtalo de nuevo.";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStored(JSON.parse(raw) as Stored);
    } catch {
      // Sin almacenamiento del navegador: la billetera se conecta de nuevo cuando haga falta.
    }
  }, []);

  const save = useCallback((value: Stored | null) => {
    setStored(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorado: solo es una comodidad.
    }
  }, []);

  const connect = useCallback(async () => {
    const kit = await loadKit(stored?.walletId);
    const { address } = await kit.authModal();
    let walletId: string | undefined;
    try {
      walletId = kit.selectedModule.productId;
    } catch {
      walletId = undefined;
    }
    save({ address, walletId });
    return address;
  }, [save, stored?.walletId]);

  const disconnect = useCallback(async () => {
    try {
      await (await loadKit()).disconnect();
    } catch {
      // Si la billetera no estaba lista, basta con olvidarla aquí.
    }
    save(null);
  }, [save]);

  const sign = useCallback(
    async (xdr: string, networkPassphrase: string) => {
      const kit = await loadKit(stored?.walletId);
      let address = stored?.address;
      try {
        if (!address) throw new Error("sin billetera");
        kit.selectedModule; // lanza si no hay una billetera elegida en esta sesión
      } catch {
        address = await connect();
      }
      const { signedTxXdr } = await kit.signTransaction(xdr, { networkPassphrase, address });
      return signedTxXdr;
    },
    [connect, stored?.address, stored?.walletId],
  );

  const value = useMemo<WalletContextValue>(
    () => ({ address: stored?.address ?? null, connect, disconnect, sign }),
    [stored?.address, connect, disconnect, sign],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet debe usarse dentro de WalletProvider.");
  return value;
}
