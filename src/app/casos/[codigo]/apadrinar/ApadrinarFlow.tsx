"use client";

import { getNetwork, requestAccess, signTransaction } from "@stellar/freighter-api";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  caseCode: string;
  assetCode: string;
  networkPassphrase: string;
  horizonUrl: string;
  explorerBaseUrl: string;
}

type Step = "idle" | "connecting" | "preparing" | "signing" | "submitting" | "confirming";

const STEP_LABELS: Record<Exclude<Step, "idle">, string> = {
  connecting: "Conectando con Freighter…",
  preparing: "Preparando tu aporte…",
  signing: "Revisa y firma en Freighter…",
  submitting: "Enviando a la red Stellar…",
  confirming: "Confirmando tu aporte en la red…",
};

const AMOUNT_PATTERN = /^\d+(\.\d{1,7})?$/;

async function postJson<T>(url: string, body: unknown): Promise<{ status: number; data: T }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T;
  return { status: response.status, data };
}

/** Envía la transacción firmada a Horizon y devuelve su hash. */
async function submitToHorizon(horizonUrl: string, signedXdr: string): Promise<string> {
  const response = await fetch(`${horizonUrl.replace(/\/+$/, "")}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: signedXdr }),
  });
  const data = (await response.json()) as {
    hash?: string;
    extras?: { result_codes?: { transaction?: string; operations?: string[] } };
  };
  if (!response.ok || !data.hash) {
    const codes = data.extras?.result_codes;
    throw new Error(
      `La red rechazó la transacción${codes ? ` (${[codes.transaction, ...(codes.operations ?? [])].filter(Boolean).join(", ")})` : ""}.`,
    );
  }
  return data.hash;
}

/**
 * Flujo de apadrinamiento (RF-APA-01): conecta Freighter, pide la transacción al servidor, la firma en la
 * billetera, la envía a la red y le pide al servidor que la confirme leyéndola en la red (RN-03).
 * El navegador nunca decide por sí solo que un aporte existe.
 */
export function ApadrinarFlow({ caseCode, assetCode, networkPassphrase, horizonUrl, explorerBaseUrl }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("10");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingHash, setPendingHash] = useState<string | null>(null);

  async function apadrinar() {
    setError(null);
    setPendingHash(null);

    if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
      setError("Escribe un monto mayor que cero, con hasta 7 decimales.");
      return;
    }

    try {
      setStep("connecting");
      const access = await requestAccess();
      if (access.error) throw new Error(access.error.message);

      const network = await getNetwork();
      if (network.error) throw new Error(network.error.message);
      if (network.networkPassphrase !== networkPassphrase) {
        throw new Error("Cambia Freighter a la red de pruebas (Testnet) e inténtalo de nuevo.");
      }

      setStep("preparing");
      const prepared = await postJson<{ xdr: string; networkPassphrase: string; error?: { message: string } }>(
        "/api/contributions/prepare",
        { caseCode, donorAccount: access.address, amount },
      );
      if (prepared.status !== 200) throw new Error(prepared.data.error?.message ?? "No se pudo preparar el aporte.");

      setStep("signing");
      const signed = await signTransaction(prepared.data.xdr, {
        networkPassphrase: prepared.data.networkPassphrase,
        address: access.address,
      });
      if (signed.error) throw new Error(signed.error.message);

      setStep("submitting");
      const txHash = await submitToHorizon(horizonUrl, signed.signedTxXdr);

      setStep("confirming");
      const confirmed = await postJson<{ error?: { message: string } }>("/api/contributions/confirm", {
        caseCode,
        txHash,
      });
      if (confirmed.status === 202) {
        setPendingHash(txHash);
        setStep("idle");
        return;
      }
      if (confirmed.status !== 200) throw new Error(confirmed.data.error?.message ?? "No se pudo confirmar el aporte.");

      router.push(`/comprobante/${txHash}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
      setStep("idle");
    }
  }

  const busy = step !== "idle";

  return (
    <div className="max-w-md space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Monto del aporte ({assetCode})</span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={busy}
          className="mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2"
        />
      </label>

      <button
        type="button"
        onClick={apadrinar}
        disabled={busy}
        className="rounded-lg bg-[var(--color-acento)] px-5 py-2 font-medium text-white disabled:opacity-60"
      >
        {busy ? STEP_LABELS[step] : "Conectar billetera y apadrinar"}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {pendingHash ? (
        <p role="status" className="text-sm">
          Tu pago fue enviado, pero la red aún no lo muestra. Lo confirmaremos automáticamente en unos minutos.{" "}
          <a
            className="underline"
            href={`${explorerBaseUrl.replace(/\/+$/, "")}/tx/${pendingHash}`}
            target="_blank"
            rel="noreferrer"
          >
            Ver la transacción
          </a>
        </p>
      ) : null}
    </div>
  );
}
