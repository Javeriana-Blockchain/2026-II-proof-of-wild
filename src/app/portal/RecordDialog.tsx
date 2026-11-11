"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { CATEGORY_LABELS } from "@/app/_lib/labels";
import { useWallet, walletErrorMessage } from "@/components/billetera/WalletProvider";
import { IconoCheck, IconoMenu } from "@/components/iconos";
import { buttonClass, Spinner } from "@/components/ui";
import { shortAccount } from "@/lib/stellar-account";

export interface PortalCaseOption {
  code: string;
  name: string;
  stages: Array<{ position: number; name: string; available: string }>;
}

type Kind = "gasto" | "hito";
type Step = "idle" | "preparing" | "signing" | "sending" | "confirming";
const STEP_LABELS: Record<Exclude<Step, "idle">, string> = {
  preparing: "Guardando el archivo y preparando…",
  signing: "Firma con la billetera de la ONG…",
  sending: "Enviando a la red Stellar…",
  confirming: "La red está confirmando…",
};

const field =
  "mt-1 w-full rounded-xl border-2 border-arena bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-bosque/50 focus:border-bosque focus:ring-4 focus:ring-salvia/45";
type ApiError = { error?: { message: string } };

/** Ventanas B (registrar hito) y C (registrar gasto) del portal de la ONG. */
export function RecordDialog({
  kind,
  cases,
  providers,
  ngoAccount,
  explorerBaseUrl,
  initialCase,
}: {
  kind: Kind;
  cases: PortalCaseOption[];
  providers: Array<{ id: string; name: string; account: string }>;
  ngoAccount: string;
  explorerBaseUrl: string;
  initialCase?: string;
}) {
  const router = useRouter();
  const wallet = useWallet();
  const [caseCode, setCaseCode] = useState(cases.find((c) => c.code === initialCase)?.code ?? cases[0]?.code ?? "");
  const selected = cases.find((c) => c.code === caseCode);
  const [stage, setStage] = useState(() => String(selected?.stages.find((s) => Number(s.available) > 0)?.position ?? selected?.stages[0]?.position ?? 1));
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ txHash: string | null; status: string } | null>(null);

  const stageInfo = selected?.stages.find((s) => String(s.position) === stage);
  const provider = useMemo(() => providers.find((p) => p.id === providerId), [providers, providerId]);
  const today = new Date().toISOString().slice(0, 10);
  const busy = step !== "idle";
  const close = () => {
    router.push("/portal", { scroll: false });
    router.refresh();
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set("caseCode", caseCode);
    form.set("stage", stage);
    try {
      setStep("preparing");
      const prepared = await fetch(`/api/portal/${kind === "gasto" ? "gastos" : "hitos"}/preparar`, { method: "POST", body: form });
      const prep = (await prepared.json()) as { id: string; xdr: string; networkPassphrase: string } & ApiError;
      if (!prepared.ok) throw new Error(prep.error?.message ?? "No se pudo preparar el registro.");

      setStep("signing");
      let address = wallet.address;
      if (address !== ngoAccount) address = await wallet.connect().catch((e) => Promise.reject(new Error(walletErrorMessage(e))));
      if (address !== ngoAccount) throw new Error(`Conecta la billetera de la ONG (${shortAccount(ngoAccount)}) para firmar.`);
      let signedXdr: string;
      try {
        signedXdr = await wallet.sign(prep.xdr, prep.networkPassphrase);
      } catch (e) {
        throw new Error(walletErrorMessage(e));
      }

      setStep("sending");
      const sentResponse = await fetch("/api/portal/registros/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id: prep.id, signedXdr }),
      });
      const sent = (await sentResponse.json()) as { status: string; txHash: string | null } & ApiError;
      if (!sentResponse.ok && sentResponse.status !== 202) throw new Error(sent.error?.message ?? "No se pudo enviar el registro.");

      setStep("confirming");
      let result = sent;
      for (let i = 0; result.status === "enviada" && i < 24; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        result = (await fetch(`/api/portal/registros/${kind}/${prep.id}`).then((r) => r.json())) as typeof sent;
      }
      if (result.status === "fallida") throw new Error("La red no aceptó el registro. Revisa los datos y vuelve a intentarlo.");
      setDone({ txHash: result.txHash, status: result.status });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
    } finally {
      setStep("idle");
    }
  }

  const title = kind === "gasto" ? "Registrar gasto" : "Registrar hito";

  return (
    <div className="anim-fondo fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={() => !busy && close()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-registro"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94vh] w-full max-w-5xl anim-ventana overflow-auto rounded-[28px] bg-white p-8 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="titulo-registro" className="text-4xl">
              {title}
            </h2>
            <p className="text-secundario">
              {kind === "gasto"
                ? "El contrato le paga al proveedor y la factura queda publicada."
                : "Un avance del tratamiento con su foto o documento."}
            </p>
          </div>
          <button type="button" onClick={close} disabled={busy} aria-label="Cerrar" className="mov-hover flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-arena text-texto transition-[transform,border-color,color] duration-200 ease-(--ease-spring) hover:rotate-90 hover:border-bosque hover:text-bosque disabled:cursor-not-allowed disabled:opacity-40">
            <IconoMenu abierto className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="flex items-center gap-3 text-2xl font-semibold">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bosque text-white">
                <IconoCheck className="h-6 w-6" />
              </span>
              {done.status === "confirmada"
                ? kind === "gasto"
                  ? `Gasto registrado: el contrato le pagó a ${provider?.name ?? "el proveedor"}.`
                  : "Hito registrado en la red."
                : "Registro enviado: la red lo confirmará en unos minutos."}
            </p>
            <p className="text-secundario">
              Queda como «presentado por la ONG» y ya aparece en la línea de tiempo y en el panel de transparencia del caso.
            </p>
            <div className="flex flex-wrap gap-3">
              {done.txHash ? (
                <a href={`${explorerBaseUrl.replace(/\/+$/, "")}/tx/${done.txHash}`} target="_blank" rel="noreferrer" className={buttonClass("secundario")}>
                  Ver en Stellar Expert
                </a>
              ) : null}
              <Link href={`/casos/${caseCode}?pestana=${kind === "gasto" ? "transparencia" : "linea"}`} className={buttonClass("secundario")}>
                Ver en el caso
              </Link>
              <button type="button" onClick={close} className={buttonClass("primario")}>
                Listo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2" noValidate>
            <div className="space-y-4">
              <label className="block">
                <span className="font-semibold">Caso</span>
                <select
                  value={caseCode}
                  onChange={(e) => {
                    setCaseCode(e.target.value);
                    const next = cases.find((c) => c.code === e.target.value);
                    setStage(String(next?.stages.find((s) => Number(s.available) > 0)?.position ?? next?.stages[0]?.position ?? 1));
                  }}
                  className={field}
                >
                  {cases.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-semibold">Etapa</span>
                <select value={stage} onChange={(e) => setStage(e.target.value)} className={field}>
                  {selected?.stages.map((s) => (
                    <option key={s.position} value={s.position}>
                      {s.position}. {s.name}
                    </option>
                  ))}
                </select>
                {kind === "gasto" && stageInfo ? (
                  <span className="mt-1 block text-sm text-secundario">
                    Disponible en esta etapa: <strong>{Number(stageInfo.available)} USDC</strong>
                  </span>
                ) : null}
              </label>

              {kind === "gasto" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-semibold">Monto (USDC)</span>
                      <input name="amount" inputMode="decimal" required className={field} />
                    </label>
                    <label className="block">
                      <span className="font-semibold">Categoría</span>
                      <select name="category" defaultValue="medicamentos" className={field}>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-semibold">Proveedor</span>
                      <select name="providerId" value={providerId} onChange={(e) => setProviderId(e.target.value)} className={field}>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-semibold">Cuenta del proveedor</span>
                      <input value={provider ? shortAccount(provider.account) : ""} readOnly className={`${field} bg-gris font-mono`} />
                    </label>
                    <label className="block">
                      <span className="font-semibold">Fecha</span>
                      <input name="occurredOn" type="date" defaultValue={today} max={today} required className={field} />
                    </label>
                    <label className="block">
                      <span className="font-semibold">Número de factura</span>
                      <input name="invoiceNumber" required placeholder="FV-0412" className={field} />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="font-semibold">Fecha</span>
                    <input name="occurredOn" type="date" defaultValue={today} max={today} required className={field} />
                  </label>
                  <label className="block">
                    <span className="font-semibold">Descripción corta</span>
                    <textarea name="description" rows={3} required maxLength={280} className={field} />
                  </label>
                </>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-salvia bg-gris p-6 text-center">
                <span className="text-lg font-semibold">
                  {kind === "gasto" ? "Factura (obligatoria)" : "Foto o documento del avance"}
                </span>
                <span className="text-sm text-secundario">PDF, JPG, PNG o WebP, hasta 4 MB</span>
                <input
                  name={kind === "gasto" ? "invoice" : "photo"}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  required={kind === "gasto"}
                  className="text-sm"
                />
              </label>
              <p className="rounded-2xl bg-crema p-4 text-sm">
                <strong>Antes de subir:</strong>{" "}
                {kind === "gasto"
                  ? "tapa los datos personales de terceros que aparezcan en la factura."
                  : "sin personas en la foto y sin ubicación exacta. Los metadatos se borran al subirla."}
              </p>
              {kind === "gasto" ? (
                <p className="rounded-2xl bg-salvia p-4 text-sm">
                  <strong>Doble confirmación.</strong> El contrato le paga al proveedor desde el saldo de la etapa y guarda el
                  hash de la factura. El pago se ve en Stellar Expert y la factura queda publicada en el caso.
                </p>
              ) : null}
            </div>

            {error ? (
              <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-error px-5 py-4 text-error lg:col-span-2">
                <span className="font-medium">{error}</span>
                <button type="submit" className="mov-hover cursor-pointer rounded-xl bg-error px-5 py-2 font-semibold text-white transition-transform duration-200 ease-(--ease-spring) hover:-translate-y-0.5 active:scale-95">
                  Reintentar
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-arena/60 pt-5 lg:col-span-2">
              <p className="max-w-xl text-sm text-secundario">
                Al guardar se calcula el hash del archivo y lo firmas con la billetera de la ONG ({shortAccount(ngoAccount)}).
                Queda como «presentado por la ONG».
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={close} disabled={busy} className={buttonClass("secundario")}>
                  Cancelar
                </button>
                <button type="submit" disabled={busy || cases.length === 0} className={buttonClass("primario")}>
                  {busy ? <Spinner className="h-5 w-5" /> : null}
                  {busy ? STEP_LABELS[step as Exclude<Step, "idle">] : kind === "gasto" ? "Firmar y registrar gasto" : "Firmar y registrar hito"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
