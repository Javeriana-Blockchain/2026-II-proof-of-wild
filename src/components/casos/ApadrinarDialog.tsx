"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatAmount } from "@/app/_lib/format";
import { useWallet, walletErrorMessage } from "@/components/billetera/WalletProvider";
import { IconoCheck, IconoEscudo, IconoMenu } from "@/components/iconos";
import { buttonClass, Spinner } from "@/components/ui";
import { fromStroops, toStroops } from "@/lib/amount";
import { shortAccount } from "@/lib/stellar-account";
import { allocateContribution, type StageAllocation } from "@/modules/cases";
import { requiredLevel, UNVERIFIED_LIMIT } from "@/modules/identity";

export interface ApadrinarCase {
  code: string;
  name: string;
  ngoName: string;
  photoUrl: string | null;
  remaining: string;
  stages: Array<{ position: number; name: string; cost: string; covered: string }>;
}

type Step = "idle" | "preparing" | "signing" | "sending" | "confirming";
const STEP_LABELS: Record<Exclude<Step, "idle">, string> = {
  preparing: "Preparando tu aporte…",
  signing: "Revisa y firma en tu billetera…",
  sending: "Enviando a la red Stellar…",
  confirming: "La red está confirmando tu aporte…",
};

interface Receipt {
  txHash: string;
  amount: string;
  allocation: StageAllocation[];
  at: Date;
}

const SUGGESTED = ["10", "25", "50"];
const AMOUNT = /^\d+([.,]\d{1,7})?$/;

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: response.ok, status: response.status, data: (await response.json()) as T };
}

type ApiError = { error?: { message: string } };

/** Ventana A: apadrinar (tu aporte) y comprobante, sobre el detalle del caso. */
export function ApadrinarDialog({
  item,
  explorerBaseUrl,
  closeHref,
  profileHref,
  welcome,
  identityVerified = false,
  returnHref,
  initialAmount,
}: {
  item: ApadrinarCase;
  explorerBaseUrl: string;
  closeHref: string;
  profileHref: string | null;
  /** Recién creó su cuenta o ingresó para apadrinar: se le da la bienvenida con su nombre. */
  welcome?: string | null;
  /** Identidad verificada (nivel 2): sin límite de monto (ADR-21). */
  identityVerified?: boolean;
  /** Esta ventana: a donde vuelve la persona después de verificarse, con el monto que había elegido. */
  returnHref?: string;
  /** Monto elegido antes de ir a verificarse. */
  initialAmount?: string;
}) {
  const router = useRouter();
  const wallet = useWallet();
  const [amount, setAmount] = useState(initialAmount ?? SUGGESTED.find((s) => Number(s) <= Number(item.remaining)) ?? "");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    router.push(closeHref, { scroll: false });
    router.refresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && step === "idle" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const preview = useMemo(() => {
    if (!AMOUNT.test(amount)) return { allocation: null, message: null };
    try {
      return { allocation: allocateContribution(item.stages, amount.replace(",", ".")), message: null };
    } catch (e) {
      return { allocation: null, message: e instanceof Error ? e.message : null };
    }
  }, [amount, item.stages]);

  const needsVerification = !identityVerified && !!preview.allocation && requiredLevel(amount) === 2;
  const verifyHref = returnHref
    ? `/cuenta/verificar?volver=${encodeURIComponent(`${returnHref}&monto=${amount}`)}`
    : "/cuenta/verificar";

  const stageName = (position: number) => item.stages.find((s) => s.position === position)?.name ?? `Etapa ${position}`;
  const busy = step !== "idle";

  async function confirm() {
    setError(null);
    if (!preview.allocation) return setError(preview.message ?? "Escribe un monto mayor que cero.");
    try {
      const donor = wallet.address ?? (await wallet.connect());
      setStep("preparing");
      const prepared = await postJson<{ xdr: string; networkPassphrase: string; allocation: StageAllocation[] } & ApiError>(
        "/api/aportes/preparar",
        { caseCode: item.code, donorAccount: donor, amount },
      );
      if (!prepared.ok) throw new Error(prepared.data.error?.message ?? "No se pudo preparar el aporte.");

      setStep("signing");
      let signedXdr: string;
      try {
        signedXdr = await wallet.sign(prepared.data.xdr, prepared.data.networkPassphrase);
      } catch (e) {
        throw new Error(walletErrorMessage(e));
      }

      setStep("sending");
      const sent = await postJson<{ txHash: string; status: string; message?: string } & ApiError>("/api/aportes/enviar", {
        signedXdr,
      });
      if (!sent.ok && sent.status !== 202) throw new Error(sent.data.error?.message ?? "No se pudo enviar el aporte.");

      let status = sent.data.status;
      setStep("confirming");
      for (let i = 0; status === "enviada" && i < 24; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const check = await fetch(`/api/aportes/${sent.data.txHash}`).then((r) => r.json() as Promise<{ status: string; message?: string }>);
        status = check.status;
        if (status === "fallida") throw new Error(check.message ?? "La red no aceptó el aporte.");
      }
      if (status === "fallida") throw new Error(sent.data.message ?? "La red no aceptó el aporte.");
      if (status !== "confirmada") {
        throw new Error("Tu aporte quedó enviado y la red lo confirmará en unos minutos. Puedes verlo en tu perfil.");
      }
      setReceipt({ txHash: sent.data.txHash, amount, allocation: prepared.data.allocation, at: new Date() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
    } finally {
      setStep("idle");
    }
  }

  async function share() {
    const url = `${window.location.origin}/comprobante/${receipt?.txHash}`;
    const text = `Apadriné a ${item.name} (${item.code}) en Proof of Wild. Compruébalo en Stellar.`;
    if (navigator.share) {
      await navigator.share({ title: "Proof of Wild", text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
    }
  }

  const remainingAfter = receipt
    ? fromStroops(toStroops(item.remaining) - toStroops(receipt.amount.replace(",", ".")))
    : item.remaining;
  const allocation = receipt?.allocation ?? preview.allocation;

  return (
    <div className="anim-fondo fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={() => !busy && close()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-apadrinar"
        onClick={(e) => e.stopPropagation()}
        className="anim-ventana grid max-h-[94vh] w-full max-w-5xl overflow-auto rounded-[28px] bg-white shadow-2xl md:grid-cols-[1fr_1.4fr]"
      >
        <aside className="space-y-4 bg-crema p-7">
          <div className="relative aspect-[4/2.2] overflow-hidden rounded-2xl bg-white">
            {item.photoUrl ? <Image src={item.photoUrl} alt={item.name} fill sizes="400px" className="object-cover" /> : null}
          </div>
          <div>
            <p className="font-serif text-3xl">{item.name}</p>
            <p className="text-secundario">
              {item.code} · {item.ngoName}
            </p>
          </div>
          <p className="flex justify-between border-t border-arena pt-3">
            <span>{receipt ? "Ahora falta para el tratamiento" : "Falta para el tratamiento"}</span>
            <strong>{formatAmount(remainingAfter)}</strong>
          </p>
          <div className="rounded-2xl bg-salvia p-5">
            <p className="font-semibold">{receipt ? "Cómo se repartió tu aporte" : "Así se usaría tu aporte"}</p>
            {allocation ? (
              <ul className="mt-2 space-y-1.5">
                {allocation.map((a) => (
                  <li key={a.position} className="flex justify-between gap-3">
                    <span>
                      {a.position}. {stageName(a.position)}
                    </span>
                    <strong className="whitespace-nowrap">{formatAmount(a.amount)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm">{preview.message ?? "Elige un monto para ver en qué se usaría."}</p>
            )}
            <p className="mt-3 text-sm">Se reparte en orden: primero la etapa que falte por cubrir.</p>
          </div>
        </aside>

        <section className="space-y-5 p-8">
          <div className="flex items-center justify-between gap-4">
            <ol className="flex items-center gap-3 text-sm font-semibold">
              <li className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${receipt ? "bg-crema" : "bg-bosque text-white"}`}>1</span>
                Tu aporte
              </li>
              <li aria-hidden className="h-px w-10 bg-arena" />
              <li className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${receipt ? "bg-bosque text-white" : "bg-crema"}`}>2</span>
                Comprobante
              </li>
            </ol>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              aria-label="Cerrar"
              className="mov-hover flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-arena text-texto transition-[transform,border-color,color] duration-200 ease-(--ease-spring) hover:rotate-90 hover:border-bosque hover:text-bosque disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconoMenu abierto className="h-5 w-5" />
            </button>
          </div>

          {receipt ? (
            <div className="space-y-5">
              <h2 id="titulo-apadrinar" className="flex items-center gap-4 text-4xl">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
                  <IconoCheck className="h-7 w-7" />
                </span>
                ¡Gracias! Tu aporte quedó registrado
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 rounded-2xl bg-gris p-5">
                <dt className="text-secundario">Monto</dt>
                <dd className="font-semibold">{formatAmount(receipt.amount.replace(",", "."))}</dd>
                <dt className="text-secundario">Caso</dt>
                <dd>
                  {item.name} · {item.code}
                </dd>
                <dt className="text-secundario">Fecha</dt>
                <dd>
                  {receipt.at.toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </dd>
                <dt className="text-secundario">Transacción</dt>
                <dd className="flex flex-wrap gap-3">
                  <span className="font-mono">
                    {receipt.txHash.slice(0, 4)}…{receipt.txHash.slice(-4)}
                  </span>
                  <a
                    href={`${explorerBaseUrl.replace(/\/+$/, "")}/tx/${receipt.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-bosque underline"
                  >
                    Ver en Stellar Expert
                  </a>
                </dd>
              </dl>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={close} className={buttonClass("primario")}>
                  Ver en qué se usa
                </button>
                <Link href={profileHref ?? `/huella/${wallet.address ?? ""}`} className={buttonClass("secundario")}>
                  Ir a mi perfil
                </Link>
                <button type="button" onClick={share} className="font-semibold text-bosque underline">
                  {copied ? "Enlace copiado" : "Compartir"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceipt(null);
                  router.refresh();
                }}
                className="text-sm font-medium text-bosque underline"
              >
                Hacer otro aporte
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {welcome != null ? (
                <p className="anim-ventana flex items-center gap-3 rounded-[18px] bg-salvia px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
                    <IconoCheck className="h-4 w-4" />
                  </span>
                  <span>
                    <strong>¡Listo{welcome ? `, ${welcome}` : ""}!</strong> Tu cuenta está lista. Ahora elige tu aporte y
                    conecta tu billetera.
                  </span>
                </p>
              ) : null}
              <div className="space-y-2">
                <h2 id="titulo-apadrinar" className="text-4xl">
                  Apadrina este caso
                </h2>
                {identityVerified ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-bosque">
                    <IconoEscudo className="h-4 w-4" /> Identidad verificada · sin límite de monto
                  </p>
                ) : null}
              </div>
              <fieldset>
                <legend className="mb-2 font-semibold">Elige el monto de tu aporte</legend>
                <div className="grid grid-cols-3 gap-3">
                  {SUGGESTED.map((s) => {
                    const fits = Number(s) <= Number(item.remaining);
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={!fits || busy}
                        aria-pressed={amount === s}
                        onClick={() => setAmount(s)}
                        className={`mov-hover cifras cursor-pointer rounded-xl border-2 py-3 text-lg font-semibold transition-[transform,background-color,border-color,color] duration-200 ease-(--ease-spring) hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${amount === s ? "border-bosque bg-bosque text-white" : "border-arena hover:border-bosque hover:text-bosque"}`}
                      >
                        {s} USDC
                      </button>
                    );
                  })}
                </div>
                <label className="mt-3 flex items-center gap-3">
                  <span className="shrink-0">Otro valor</span>
                  <input
                    inputMode="decimal"
                    value={SUGGESTED.includes(amount) ? "" : amount}
                    onChange={(e) => setAmount(e.target.value.trim())}
                    disabled={busy}
                    placeholder="Monto en USDC"
                    className="w-full rounded-xl border border-arena px-4 py-3 outline-none focus:border-bosque"
                  />
                </label>
                <p className="mt-2 text-sm text-secundario">Aporte único. No puede superar lo que falta para el tratamiento.</p>
              </fieldset>

              {needsVerification ? (
                <div className="anim-ventana flex flex-wrap items-center gap-4 rounded-[18px] bg-crema p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-profundo text-crema">
                    <IconoEscudo className="h-5 w-5" />
                  </span>
                  <p className="min-w-0 flex-1">
                    <strong className="block">Para aportes de más de {UNVERIFIED_LIMIT} USDC, verifica tu identidad</strong>
                    <span className="text-sm text-secundario">Toma unos dos minutos y vuelves aquí con tu aporte.</span>
                  </p>
                  <Link href={verifyHref} className={buttonClass("primario", "py-2.5")}>
                    Verificar mi identidad
                  </Link>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-gris px-5 py-4">
                {wallet.address ? (
                  <>
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-bosque" />
                      Billetera conectada: <strong className="font-mono">{shortAccount(wallet.address)}</strong>
                    </span>
                    <button type="button" disabled={busy} onClick={() => wallet.connect().catch(() => {})} className="font-medium text-bosque underline">
                      Cambiar
                    </button>
                  </>
                ) : (
                  <>
                    <span>Conecta tu billetera de Stellar (en testnet) para firmar.</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => wallet.connect().catch((e) => setError(walletErrorMessage(e)))}
                      className={buttonClass("secundario", "py-2")}
                    >
                      Conectar billetera
                    </button>
                  </>
                )}
              </div>

              {error ? (
                <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-error px-5 py-4 text-error">
                  <span className="font-medium">{error}</span>
                  <button type="button" onClick={confirm} className="mov-hover cursor-pointer rounded-xl bg-error px-5 py-2 font-semibold text-white transition-transform duration-200 ease-(--ease-spring) hover:-translate-y-0.5 active:scale-95">
                    Reintentar
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={confirm}
                disabled={busy || !preview.allocation || needsVerification}
                className={buttonClass("primario", "w-full py-4 text-lg")}
              >
                {busy ? <Spinner className="h-5 w-5" /> : null}
                {busy ? STEP_LABELS[step as Exclude<Step, "idle">] : `Confirmar aporte de ${preview.allocation ? formatAmount(amount.replace(",", ".")) : "…"}`}
              </button>
              <p className="text-center text-sm text-secundario">
                Tu billetera te pedirá firmar. Demo en testnet: no se usa dinero real.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
