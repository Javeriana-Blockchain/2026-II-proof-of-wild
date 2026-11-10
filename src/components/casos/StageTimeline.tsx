import Image from "next/image";
import { toStroops, fromStroops } from "@/lib/amount";
import { formatAmount } from "@/app/_lib/format";
import { STAGE_STATUS_LABELS } from "@/app/_lib/labels";
import { IconoCamara, IconoCheck } from "@/components/iconos";
import { Chip, ExplorerLink, ProgressBar, ValidationChip } from "@/components/ui";
import type { PublicStage } from "@/modules/catalog";

/**
 * Línea de tiempo del tratamiento: una tarjeta por etapa con su foto, el nombre del proceso, su costo,
 * cuánto está cubierto, el chip de validación y los enlaces a la factura y al pago en Stellar Expert.
 * Si se pasa `myAllocations` (billetera conectada), cada etapa muestra también «Tu aporte».
 */
export function StageTimeline({
  stages,
  myAllocations,
}: {
  stages: PublicStage[];
  myAllocations?: Record<number, string>;
}) {
  return (
    <div className="space-y-4">
      <ol aria-hidden className="flex items-center px-[6%]">
        {stages.map((stage, i) => (
          <li key={stage.position} className="flex flex-1 items-center last:flex-none">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[3px] ${
                stage.status === "completada"
                  ? "border-bosque bg-bosque text-white"
                  : stage.status === "en_curso"
                    ? "border-bosque bg-white"
                    : "border-arena bg-white"
              }`}
            >
              {stage.status === "completada" ? <IconoCheck /> : null}
            </span>
            {i < stages.length - 1 ? (
              <span className={`h-0.5 flex-1 ${stage.status === "completada" ? "bg-bosque" : "bg-arena"}`} />
            ) : null}
          </li>
        ))}
      </ol>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        {stages.map((stage) => (
          <li key={stage.position}>
            <StageCard stage={stage} mine={myAllocations?.[stage.position]} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function StageCard({ stage, mine }: { stage: PublicStage; mine?: string }) {
  const missing = toStroops(stage.cost) - toStroops(stage.covered);
  const percent = Number((toStroops(stage.covered) * 100n) / (toStroops(stage.cost) || 1n));
  const expense = stage.expenses.at(-1);
  const milestone = stage.milestones.at(-1);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      <div
        className={`relative flex h-28 items-center justify-center gap-2 text-sm ${stage.status === "pendiente" ? "bg-gris text-secundario" : "bg-salvia text-texto"}`}
      >
        {stage.photoUrl ? (
          <Image src={stage.photoUrl} alt={`Foto de la etapa ${stage.position}`} fill sizes="320px" className="object-cover" />
        ) : stage.status === "pendiente" ? (
          "La foto llega cuando empiece la etapa"
        ) : (
          <>
            <IconoCamara className="h-5 w-5" /> Foto de la etapa
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-secundario">Etapa {stage.position}</span>
          <Chip
            tone={stage.status === "completada" ? "logro" : stage.status === "en_curso" ? "etapa" : "borde"}
            className="text-xs"
          >
            {STAGE_STATUS_LABELS[stage.status]}
          </Chip>
        </div>
        <h3 className="font-sans text-lg leading-snug font-semibold">{stage.name}</h3>

        <div className="flex items-center gap-3">
          <ProgressBar percent={percent} label={`Cubierto de la etapa ${stage.position}`} className="bg-crema" />
          <span className="shrink-0 text-sm">
            <strong>{formatAmount(stage.covered, "")}</strong>de {formatAmount(stage.cost)}
          </span>
        </div>

        {expense ? (
          <div className="space-y-2">
            <ValidationChip level={expense.validationLevel} />
            <p className="flex gap-4 text-sm">
              <a href={expense.invoiceUrl} target="_blank" rel="noreferrer" className="font-medium text-bosque underline">
                Factura
              </a>
              <ExplorerLink href={expense.txUrl} />
            </p>
          </div>
        ) : stage.waitingForPrevious ? (
          <p className="mt-auto text-sm text-secundario">
            Empieza a cubrirse cuando la etapa {stage.position - 1} esté completa.
          </p>
        ) : (
          <p className="text-sm text-secundario">
            {missing > 0n ? `Faltan ${formatAmount(fromStroops(missing))}. ` : "Etapa cubierta. "}
            Todavía no tiene gastos.
          </p>
        )}

        {milestone ? (
          <p className="border-t border-arena/50 pt-2 text-sm">
            <span className="font-semibold">Hito:</span> {milestone.description}{" "}
            <ExplorerLink href={milestone.txUrl}>Ver en Stellar Expert</ExplorerLink>
          </p>
        ) : null}

        {mine !== undefined ? (
          <div className="mt-auto flex items-center justify-between rounded-xl bg-salvia px-4 py-3">
            <span className="font-medium">Tu aporte</span>
            <span className="font-serif text-2xl">{formatAmount(mine)}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
