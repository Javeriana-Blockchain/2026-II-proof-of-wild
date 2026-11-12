"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { VerifiedIdentity } from "@/app/cuenta/verificar/actions";
import { verifyIdentity } from "@/app/cuenta/verificar/actions";
import { IconoCamara, IconoCheck, IconoEscudo } from "@/components/iconos";
import { buttonClass, Spinner } from "@/components/ui";
import {
  cropFace,
  detectFace,
  eyeOpenness,
  fileToCanvas,
  grabFrame,
  headTurn,
  loadHuman,
  openCamera,
  similarity,
  stopCamera,
} from "./biometria";

type DocumentType = "cedula" | "pasaporte";
type Step = "intro" | "documento" | "vida" | "comparacion" | "registro" | "listo";
type Challenge = "centrar" | "parpadear" | "girar" | "listo";

const PASOS: Array<{ id: Step; titulo: string }> = [
  { id: "documento", titulo: "Documento" },
  { id: "vida", titulo: "Prueba de vida" },
  { id: "comparacion", titulo: "Comparación" },
  { id: "registro", titulo: "Registro" },
];

const INSTRUCCION: Record<Challenge, string> = {
  centrar: "Mira de frente a la cámara",
  parpadear: "Ahora parpadea",
  girar: "Gira la cabeza hacia un lado",
  listo: "¡Listo!",
};

/** Umbral de coincidencia que también exige el servidor (BIOMETRIC_THRESHOLDS.faceMatch). */
const MATCH_THRESHOLD = 0.5;

const DOC_FORMAT: Record<DocumentType, RegExp> = { cedula: /^\d{6,10}$/, pasaporte: /^[A-Z0-9]{6,9}$/ };
const clean = (value: string) => value.replace(/[\s.\-]/g, "").toUpperCase();

interface Captured {
  faceUrl: string;
  embedding: number[];
}

/**
 * Verificación de identidad de nivel 2 (ADR-21): foto del documento, prueba de vida con la cámara (parpadear y girar
 * la cabeza), comparación del rostro con el del documento y consulta al registro (simulada en la demo). La biometría
 * corre en el navegador; al servidor solo llegan los puntajes y el número del documento.
 */
export function VerificacionIdentidad({ volver, volverLabel }: { volver: string | null; volverLabel: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [consent, setConsent] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("cedula");
  const [docNumber, setDocNumber] = useState("");
  const [modelState, setModelState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [docImage, setDocImage] = useState<string | null>(null);
  const [docFace, setDocFace] = useState<Captured | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [docCamera, setDocCamera] = useState<MediaStream | null>(null);

  const [challenge, setChallenge] = useState<Challenge>("centrar");
  const [hint, setHint] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<Captured | null>(null);
  const [scores, setScores] = useState({ real: 0, live: 0, blinked: false, turned: false });
  const [attempt, setAttempt] = useState(0);

  const [match, setMatch] = useState<number | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [result, setResult] = useState<VerifiedIdentity | null>(null);
  const [registryMessage, setRegistryMessage] = useState<string | null>(null);

  const docVideo = useRef<HTMLVideoElement>(null);
  const selfieVideo = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const numberOk = DOC_FORMAT[docType].test(clean(docNumber));

  // Los modelos se cargan apenas la persona acepta, mientras escribe su documento.
  function prepareModels() {
    if (modelState === "loading" || modelState === "ready") return;
    setModelState("loading");
    loadHuman()
      .then(() => setModelState("ready"))
      .catch(() => setModelState("error"));
  }

  // ---------------------------------------------------------------- Documento
  useEffect(() => {
    if (!docCamera || !docVideo.current) return;
    docVideo.current.srcObject = docCamera;
    void docVideo.current.play().catch(() => {});
    return () => stopCamera(docCamera);
  }, [docCamera]);

  useEffect(() => {
    if (step !== "documento") setDocCamera((current) => (stopCamera(current), null));
  }, [step]);

  async function startDocCamera() {
    setError(null);
    try {
      setDocCamera(await openCamera("environment"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos abrir la cámara.");
    }
  }

  async function analyzeDocument(canvas: HTMLCanvasElement) {
    setDocBusy(true);
    setError(null);
    try {
      const human = await loadHuman();
      setModelState("ready");
      setDocImage(canvas.toDataURL("image/jpeg", 0.8));
      const face = await detectFace(human, canvas);
      if (!face?.embedding?.length) {
        setDocFace(null);
        setError("No encontramos la foto del rostro en el documento. Acércalo, con buena luz y sin reflejos.");
        return;
      }
      setDocFace({ faceUrl: cropFace(canvas, face), embedding: face.embedding });
    } catch {
      setError("No pudimos analizar la imagen. Inténtalo de nuevo.");
    } finally {
      setDocBusy(false);
    }
  }

  async function captureDocument() {
    const video = docVideo.current;
    if (!video || !video.videoWidth) return;
    const frame = grabFrame(video);
    setDocCamera((current) => (stopCamera(current), null));
    await analyzeDocument(frame);
  }

  async function uploadDocument(file: File | undefined) {
    if (!file) return;
    setDocCamera((current) => (stopCamera(current), null));
    try {
      await analyzeDocument(await fileToCanvas(file));
    } catch {
      setError("No pudimos leer esa imagen. Usa una foto JPG o PNG.");
    }
  }

  // ----------------------------------------------------------- Prueba de vida
  useEffect(() => {
    if (step !== "vida") return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    const state = {
      challenge: "centrar" as Challenge,
      centered: 0,
      baseline: [] as number[],
      closed: false,
      blinked: false,
      turned: false,
      real: 0,
      live: 0,
      since: performance.now(),
    };
    setChallenge("centrar");
    setScores({ real: 0, live: 0, blinked: false, turned: false });
    setSelfie(null);
    setHint(null);

    const advance = (next: Challenge) => {
      state.challenge = next;
      state.since = performance.now();
      setChallenge(next);
      setHint(null);
    };

    (async () => {
      try {
        const human = await loadHuman();
        setModelState("ready");
        stream = await openCamera("user");
        if (stopped) return stopCamera(stream);
        const video = selfieVideo.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (stopped) return;
          const face = await detectFace(human, video).catch(() => null);
          if (stopped) return;
          const ear = face ? eyeOpenness(face) : null;
          const turn = face ? headTurn(face) : null;

          if (!face || ear == null || turn == null) {
            setHint("No vemos tu rostro: acércate y busca buena luz.");
          } else {
            state.real = Math.max(state.real, face.real ?? 0);
            state.live = Math.max(state.live, face.live ?? 0);
            const waited = performance.now() - state.since;

            if (state.challenge === "centrar") {
              const frontal = turn > 0.38 && turn < 0.62 && ear > 0.15;
              state.centered = frontal ? state.centered + 1 : 0;
              if (frontal) state.baseline.push(ear);
              setHint(frontal ? null : "Centra tu rostro y mira a la cámara.");
              if (state.centered >= 12 && face.embedding?.length) {
                setSelfie({ faceUrl: cropFace(grabFrame(video), face), embedding: face.embedding });
                advance("parpadear");
              }
            } else if (state.challenge === "parpadear") {
              const open = state.baseline.reduce((a, b) => a + b, 0) / Math.max(1, state.baseline.length);
              if (ear < open * 0.62) state.closed = true;
              if (state.closed && ear > open * 0.82) {
                state.blinked = true;
                advance("girar");
              } else if (waited > 9000) {
                setHint("Cierra los ojos un instante y vuelve a abrirlos.");
              }
            } else if (state.challenge === "girar") {
              if (turn < 0.3 || turn > 0.7) {
                state.turned = true;
                advance("listo");
              } else if (waited > 9000) {
                setHint("Gira un poco más, como si miraras por encima del hombro.");
              }
            }
            setScores({ real: state.real, live: state.live, blinked: state.blinked, turned: state.turned });
          }

          if (state.challenge === "listo") {
            stopCamera(stream);
            setTimeout(() => !stopped && setStep("comparacion"), 700);
            return;
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : "No pudimos iniciar la prueba de vida.");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stopCamera(stream);
    };
  }, [step, attempt]);

  // -------------------------------------------------------------- Comparación
  useEffect(() => {
    if (step !== "comparacion" || !docFace || !selfie) return;
    let cancelled = false;
    loadHuman().then((human) => {
      if (!cancelled) setMatch(similarity(human, docFace.embedding, selfie.embedding));
    });
    return () => {
      cancelled = true;
    };
  }, [step, docFace, selfie]);

  // ----------------------------------------------------------------- Registro
  async function submit(method: "biometria" | "simulada") {
    setStep("registro");
    setError(null);
    setRegistryMessage(null);
    const response = await verifyIdentity({
      documentType: docType,
      documentNumber: clean(docNumber),
      consent,
      evidence:
        method === "biometria"
          ? { method, faceMatch: match ?? 0, real: scores.real, live: scores.live, blinked: scores.blinked, turned: scores.turned }
          : { method },
    });
    if (response.ok) {
      setResult(response.identity);
      setStep("listo");
    } else {
      setRegistryMessage(response.message);
    }
  }

  function simulate() {
    if (!numberOk) {
      setStep("documento");
      setError("Escribe tu número de documento para simular la verificación.");
      return;
    }
    setSimulated(true);
    void submit("simulada");
  }

  const stepIndex = PASOS.findIndex((p) => p.id === step);
  const matchOk = match != null && match >= MATCH_THRESHOLD;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {step !== "intro" ? (
        <ol className="grid grid-cols-4 gap-2" aria-label="Pasos de la verificación">
          {PASOS.map((paso, i) => {
            const done = step === "listo" || i < stepIndex;
            const current = i === stepIndex;
            return (
              <li key={paso.id} className="space-y-2">
                <span
                  className={`block h-1.5 rounded-full transition-colors duration-500 ${done ? "bg-bosque" : current ? "bg-arena" : "bg-arena/30"}`}
                />
                <span className={`flex items-center gap-1.5 text-sm ${current ? "font-semibold" : "text-secundario"}`}>
                  {done ? <IconoCheck className="h-3.5 w-3.5 text-bosque" /> : <span className="cifras">{i + 1}</span>}
                  {paso.titulo}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <section className="anim-ventana overflow-hidden rounded-[28px] bg-white ring-1 ring-arena/70">
        {/* ------------------------------------------------------------- Inicio */}
        {step === "intro" ? (
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <aside className="space-y-5 bg-profundo p-7 text-white sm:p-9">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-crema text-profundo ring-4 ring-arena">
                <IconoEscudo className="h-8 w-8" />
              </span>
              <h2 className="text-4xl">Así funciona</h2>
              <ol className="space-y-4">
                {[
                  ["Documento", "Una foto de tu cédula o pasaporte."],
                  ["Prueba de vida", "Parpadeas y giras la cabeza frente a la cámara."],
                  ["Comparación", "Tu rostro contra la foto del documento."],
                  ["Registro", "Consultamos que el documento exista (simulado en la demo)."],
                ].map(([titulo, texto], i) => (
                  <li key={titulo} className="flex gap-3">
                    <span className="cifras flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-arena font-bold text-arena">
                      {i + 1}
                    </span>
                    <span>
                      <strong className="block">{titulo}</strong>
                      <span className="text-white/80">{texto}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </aside>
            <div className="space-y-5 p-7 sm:p-9">
              <h2 className="text-4xl">Tus fotos no salen de tu navegador</h2>
              <p className="text-secundario">
                El reconocimiento facial corre en tu equipo. Guardamos solo el resultado: que te verificaste, cuándo, el tipo
                de documento y sus últimos 4 dígitos. Puedes borrar tu verificación cuando quieras.
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-[18px] bg-crema p-4 transition-colors hover:bg-arena/40">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-bosque"
                />
                <span className="text-sm">
                  Autorizo a Proof of Wild a tratar mis datos biométricos, que son datos sensibles, solo para verificar mi
                  identidad. Sé que no estoy obligado a darlos y que puedo apadrinar hasta 50 USDC sin hacerlo (Ley 1581 de
                  2012).
                </span>
              </label>
              <button
                type="button"
                disabled={!consent}
                onClick={() => {
                  prepareModels();
                  setStep("documento");
                }}
                className={buttonClass("primario", "w-full py-4 text-lg")}
              >
                Empezar la verificación
              </button>
            </div>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- Documento */}
        {step === "documento" ? (
          <div className="grid gap-8 p-7 sm:p-9 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <h2 className="text-4xl">Tu documento</h2>
              <fieldset className="grid grid-cols-2 gap-3">
                <legend className="mb-2 font-semibold">Tipo de documento</legend>
                {(["cedula", "pasaporte"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={docType === type}
                    onClick={() => setDocType(type)}
                    className={`mov-hover cursor-pointer rounded-xl border-2 px-3 py-3 font-semibold transition-[transform,background-color,border-color,color] duration-200 ease-(--ease-spring) hover:-translate-y-0.5 ${docType === type ? "border-bosque bg-bosque text-white" : "border-arena hover:border-bosque hover:text-bosque"}`}
                  >
                    {type === "cedula" ? "Cédula" : "Pasaporte"}
                  </button>
                ))}
              </fieldset>
              <label className="block space-y-2">
                <span className="font-semibold">Número</span>
                <input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  inputMode={docType === "cedula" ? "numeric" : "text"}
                  autoComplete="off"
                  placeholder={docType === "cedula" ? "1.020.304.050" : "AB1234567"}
                  className="cifras w-full rounded-xl border-2 border-arena px-4 py-3 text-lg outline-none transition-colors hover:border-bosque/60 focus:border-bosque"
                />
                <span className="block text-sm text-secundario">
                  {docType === "cedula" ? "Entre 6 y 10 dígitos." : "Entre 6 y 9 letras o números."} Solo guardamos los
                  últimos 4.
                </span>
              </label>
              {modelState === "loading" ? (
                <p className="flex items-center gap-2 text-sm text-secundario">
                  <Spinner /> Preparando el reconocimiento facial (solo la primera vez)…
                </p>
              ) : null}
              {modelState === "error" ? (
                <p className="text-sm text-error">No se pudo cargar el reconocimiento facial. Puedes simular la verificación.</p>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="relative aspect-[1.586] overflow-hidden rounded-[20px] bg-texto">
                {docCamera ? (
                  <>
                    <video ref={docVideo} playsInline muted className="h-full w-full object-cover" />
                    <span aria-hidden className="absolute inset-5 rounded-[14px] border-4 border-dashed border-crema/90" />
                    <span className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-white">
                      Ubica el lado con tu foto dentro del marco
                    </span>
                  </>
                ) : docImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagen local en memoria, nunca se sube
                  <img src={docImage} alt="Foto de tu documento" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 border-4 border-dashed border-white/25 text-white/80">
                    <IconoCamara className="h-10 w-10" />
                    <span>Foto del lado de tu documento con tu foto</span>
                  </div>
                )}
                {docBusy ? (
                  <span className="absolute inset-0 flex items-center justify-center gap-2 bg-texto/70 font-semibold text-white">
                    <Spinner /> Buscando el rostro en el documento…
                  </span>
                ) : null}
                {docFace ? (
                  <span className="anim-ventana absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm font-semibold">
                    {/* eslint-disable-next-line @next/next/no-img-element -- recorte local */}
                    <img src={docFace.faceUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                    <IconoCheck className="h-4 w-4 text-bosque" /> Rostro encontrado
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {docCamera ? (
                  <button type="button" onClick={captureDocument} className={buttonClass("primario")}>
                    <IconoCamara className="h-5 w-5" /> Tomar la foto
                  </button>
                ) : (
                  <button type="button" onClick={startDocCamera} disabled={docBusy} className={buttonClass("secundario")}>
                    <IconoCamara className="h-5 w-5" /> {docImage ? "Tomar otra" : "Usar la cámara"}
                  </button>
                )}
                <button type="button" onClick={() => fileInput.current?.click()} disabled={docBusy} className={buttonClass("secundario")}>
                  Subir una foto
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void uploadDocument(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>

              {error ? (
                <p role="alert" className="rounded-[14px] border border-error px-4 py-3 text-error">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                disabled={!numberOk || !docFace || docBusy}
                onClick={() => {
                  setError(null);
                  setStep("vida");
                }}
                className={buttonClass("primario", "w-full py-4 text-lg")}
              >
                Continuar a la prueba de vida
              </button>
            </div>
          </div>
        ) : null}

        {/* ----------------------------------------------------- Prueba de vida */}
        {step === "vida" ? (
          <div className="grid items-center gap-8 p-7 sm:p-9 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-xs">
              <div
                className={`absolute inset-0 overflow-hidden rounded-[50%] bg-texto ring-8 transition-[--tw-ring-color] duration-500 ${challenge === "listo" ? "ring-bosque" : "ring-arena"}`}
              >
                <video ref={selfieVideo} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
              </div>
              {challenge !== "listo" ? (
                <span aria-hidden className="absolute -inset-3 animate-latido rounded-[50%] border-4 border-bosque/40" />
              ) : (
                <span className="sello absolute right-0 bottom-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-bosque text-white">
                  <IconoCheck className="h-8 w-8" />
                </span>
              )}
            </div>

            <div className="space-y-5">
              <p className="rotulo text-secundario">Prueba de vida</p>
              <h2 key={challenge} className="anim-ventana text-4xl" aria-live="polite">
                {INSTRUCCION[challenge]}
              </h2>
              <ul className="space-y-3">
                {(
                  [
                    ["Rostro de frente", challenge !== "centrar"],
                    ["Parpadeo", scores.blinked],
                    ["Giro de cabeza", scores.turned],
                  ] as const
                ).map(([label, ok]) => (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${ok ? "bg-bosque text-white" : "border-2 border-dashed border-arena"}`}
                    >
                      {ok ? <IconoCheck className="h-4 w-4" /> : null}
                    </span>
                    <span className={ok ? "font-semibold" : "text-secundario"}>{label}</span>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meter label="Rostro real" value={scores.real} />
                <Meter label="Rostro vivo" value={scores.live} />
              </div>
              {hint ? <p className="rounded-[14px] bg-crema px-4 py-3">{hint}</p> : null}
              {error ? (
                <p role="alert" className="rounded-[14px] border border-error px-4 py-3 text-error">
                  {error}
                </p>
              ) : null}
              {modelState === "loading" ? (
                <p className="flex items-center gap-2 text-sm text-secundario">
                  <Spinner /> Preparando el reconocimiento facial…
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAttempt((n) => n + 1);
                }}
                className="enlace text-sm"
              >
                Empezar de nuevo la prueba
              </button>
            </div>
          </div>
        ) : null}

        {/* -------------------------------------------------------- Comparación */}
        {step === "comparacion" ? (
          <div className="space-y-7 p-7 text-center sm:p-9">
            <h2 className="text-4xl">¿Eres la persona del documento?</h2>
            <div className="flex items-center justify-center gap-4 sm:gap-8">
              <FaceCircle src={docFace?.faceUrl} label="Documento" />
              <div className="w-28 space-y-2 sm:w-40">
                <p className={`cifras font-display text-5xl font-bold ${match == null ? "text-secundario" : matchOk ? "text-bosque" : "text-error"}`}>
                  {match == null ? <Spinner className="mx-auto h-8 w-8" /> : `${Math.round(match * 100)} %`}
                </p>
                <span className="block h-2 overflow-hidden rounded-full bg-arena/40">
                  <span
                    className={`block h-full rounded-full transition-[width] duration-1000 ease-(--ease-out-expo) ${matchOk ? "bg-bosque" : "bg-error"}`}
                    style={{ width: `${Math.round((match ?? 0) * 100)}%` }}
                  />
                </span>
                <span className="block text-sm text-secundario">coincidencia</span>
              </div>
              <FaceCircle src={selfie?.faceUrl} label="Cámara" />
            </div>
            {match == null ? null : matchOk ? (
              <div className="space-y-4">
                <p className="text-lg">Tu rostro coincide con la foto del documento.</p>
                <button type="button" onClick={() => void submit("biometria")} className={buttonClass("primario", "px-8 py-4 text-lg")}>
                  Consultar el registro
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg text-error">
                  No coincide lo suficiente (se necesita {Math.round(MATCH_THRESHOLD * 100)} %). Prueba con más luz o con
                  otra foto del documento.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMatch(null);
                      setStep("vida");
                      setAttempt((n) => n + 1);
                    }}
                    className={buttonClass("primario")}
                  >
                    Repetir la prueba de vida
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatch(null);
                      setStep("documento");
                    }}
                    className={buttonClass("secundario")}
                  >
                    Otra foto del documento
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* ----------------------------------------------------------- Registro */}
        {step === "registro" ? (
          <div className="mx-auto max-w-xl space-y-6 p-7 sm:p-9">
            <h2 className="text-4xl">Consultando el registro</h2>
            <ul className="space-y-4">
              <RegistryLine done label={`${docType === "cedula" ? "Cédula" : "Pasaporte"} terminada en ${clean(docNumber).slice(-4)}`} />
              <RegistryLine
                done={!simulated}
                skipped={simulated}
                label={simulated ? "Biometría omitida (verificación simulada)" : "Prueba de vida y rostro coinciden"}
              />
              <RegistryLine
                done={false}
                failed={!!registryMessage}
                label={
                  registryMessage ?? `Consultando ${docType === "cedula" ? "la Registraduría" : "el registro de pasaportes"} (simulado)…`
                }
              />
            </ul>
            {registryMessage ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRegistryMessage(null);
                    setSimulated(false);
                    setStep("documento");
                  }}
                  className={buttonClass("primario")}
                >
                  Revisar mi documento
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* -------------------------------------------------------------- Listo */}
        {step === "listo" && result ? (
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <aside className="flex flex-col items-center justify-center gap-4 bg-profundo p-9 text-center text-white">
              <span className="sello relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-arena bg-crema text-profundo">
                <IconoEscudo className="h-14 w-14" />
                <span className="absolute -right-1 -bottom-1 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-crema bg-bosque text-white">
                  <IconoCheck className="h-5 w-5" />
                </span>
              </span>
              <p className="font-display text-3xl font-bold">Identidad verificada</p>
              <p className="text-white/85">Nivel 2: puedes apadrinar sin límite de monto.</p>
            </aside>
            <div className="space-y-5 p-7 sm:p-9">
              <h2 className="text-4xl">¡Listo! Tu identidad quedó verificada</h2>
              <IdentitySummary identity={result} />
              <div className="flex flex-wrap gap-3">
                {volver ? (
                  <button type="button" onClick={() => router.push(volver)} className={buttonClass("primario", "py-3.5")}>
                    {volverLabel}
                  </button>
                ) : null}
                <Link href="/perfil" className={buttonClass(volver ? "secundario" : "primario", "py-3.5")}>
                  Ir a mi perfil
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {step === "documento" || step === "vida" ? (
        <p className="text-center text-sm text-secundario">
          ¿La cámara no funciona?{" "}
          <button type="button" onClick={simulate} className="enlace">
            Simular la verificación (demo)
          </button>
        </p>
      ) : null}
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const ok = value >= 0.5;
  return (
    <span className="space-y-1.5 rounded-[14px] bg-gris p-3">
      <span className="flex justify-between">
        <span>{label}</span>
        <strong className="cifras">{Math.round(value * 100)} %</strong>
      </span>
      <span className="block h-1.5 overflow-hidden rounded-full bg-arena/40">
        <span
          className={`block h-full rounded-full transition-[width] duration-300 ${ok ? "bg-bosque" : "bg-arena"}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </span>
    </span>
  );
}

function FaceCircle({ src, label }: { src?: string; label: string }) {
  return (
    <figure className="space-y-2">
      <span className="anim-ventana block h-28 w-28 overflow-hidden rounded-full bg-salvia ring-4 ring-arena sm:h-36 sm:w-36">
        {/* eslint-disable-next-line @next/next/no-img-element -- recorte local en memoria */}
        {src ? <img src={src} alt={`Rostro: ${label}`} className="h-full w-full object-cover" /> : null}
      </span>
      <figcaption className="rotulo text-secundario">{label}</figcaption>
    </figure>
  );
}

function RegistryLine({ label, done, failed = false, skipped = false }: { label: string; done: boolean; failed?: boolean; skipped?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? "bg-bosque text-white" : failed ? "bg-error text-white" : skipped ? "border-2 border-dashed border-arena" : "bg-crema"}`}
      >
        {done ? <IconoCheck className="h-4 w-4" /> : failed ? "!" : skipped ? null : <Spinner />}
      </span>
      <span className={failed ? "font-semibold text-error" : ""}>{label}</span>
    </li>
  );
}

/** Lo que quedó guardado de la verificación. */
export function IdentitySummary({ identity }: { identity: VerifiedIdentity }) {
  const rows: Array<[string, string]> = [
    ["Documento", `Terminado en ${identity.documentLast4}`],
    [
      "Método",
      identity.method === "biometria"
        ? `Prueba de vida y rostro (${Math.round((identity.faceMatch ?? 0) * 100)} % de coincidencia)`
        : "Simulada para la demo, sin biometría",
    ],
    ["Registro", identity.provider],
    ["Referencia", identity.providerReference],
    ["Fecha", new Date(identity.verifiedAt).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 rounded-[18px] bg-gris p-5">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-secundario">{k}</dt>
          <dd className="font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
