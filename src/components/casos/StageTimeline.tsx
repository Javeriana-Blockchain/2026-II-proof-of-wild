import Image from "next/image";
import { formatAmount } from "@/app/_lib/format";
import { STAGE_STATUS_LABELS } from "@/app/_lib/labels";
import { IconoCamara, IconoEtapa, stageKind } from "@/components/iconos";
import { Chip, ExplorerLink, ProgressBar, ValidationChip } from "@/components/ui";
import { fromStroops, toStroops } from "@/lib/amount";
import type { PublicStage } from "@/modules/catalog";
import { Reveal } from "@/components/movimiento/Reveal";

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
    <ol className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {stages.map((stage, i) => (
        <Reveal as="li" variant="pop" delay={i} key={stage.position}>
          <StageCard stage={stage} mine={myAllocations?.[stage.position]} />
        </Reveal>
      ))}
    </ol>
  );
}

function StageCard({ stage, mine }: { stage: PublicStage; mine?: string }) {
  const missing = toStroops(stage.cost) - toStroops(stage.covered);
  const percent = Number((toStroops(stage.covered) * 100n) / (toStroops(stage.cost) || 1n));
  const expense = stage.expenses.at(-1);
  const milestone = stage.milestones.at(-1);
  const pending = stage.status === "pendiente";
  const kind = stageKind(stage.name);

  return (
    <article
      className={`group/etapa flex h-full flex-col overflow-hidden rounded-[24px] bg-white ring-1 transition-[transform,box-shadow] duration-300 ease-(--ease-spring) hover:-translate-y-1 hover:shadow-[0_22px_44px_-30px_rgb(31_42_34/0.6)] ${stage.status === "en_curso" ? "ring-2 ring-bosque" : "ring-arena/70"}`}
    >
      <div
        className={`relative flex h-36 items-center justify-center gap-2 overflow-hidden text-sm ${pending ? "bg-crema text-secundario" : "bg-salvia text-texto"}`}
      >
        {stage.photoUrl ? (
          <Image
            src={stage.photoUrl}
            alt={`Foto de la etapa ${stage.position}: ${stage.name}`}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/etapa:scale-[1.06]"
          />
        ) : pending ? (
          <span className="flex flex-col items-center gap-2 px-4 text-center">
            <IconoEtapa kind={kind} className="h-7 w-7 opacity-60" />
            La foto llega cuando empiece la etapa
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <IconoCamara className="h-5 w-5" /> Foto de la etapa
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="rotulo flex items-center gap-1.5 text-secundario">
            <IconoEtapa kind={kind} className="h-3.5 w-3.5" />
            Etapa {stage.position}
          </span>
          <Chip tone={stage.status === "completada" ? "logro" : stage.status === "en_curso" ? "etapa" : "borde"}>
            {STAGE_STATUS_LABELS[stage.status]}
          </Chip>
        </div>
        <h3 className="font-display text-2xl leading-tight font-semibold">{stage.name}</h3>

        <div className="space-y-1.5">
          <p className="cifras text-sm">
            <strong className="text-base">{formatAmount(stage.covered, "")}</strong>de {formatAmount(stage.cost)}
          </p>
          <ProgressBar percent={percent} label={`Cubierto de la etapa ${stage.position}`} />
        </div>

        {expense ? (
          <div className="space-y-2">
            <ValidationChip level={expense.validationLevel} />
            <p className="flex flex-wrap gap-4 text-sm">
              <a href={expense.invoiceUrl} target="_blank" rel="noreferrer" className="enlace">
                Factura
              </a>
              <ExplorerLink href={expense.txUrl} />
            </p>
          </div>
        ) : stage.waitingForPrevious ? (
          <p className="mt-auto text-sm text-secundario">Empieza a cubrirse cuando la etapa {stage.position - 1} esté completa.</p>
        ) : (
          <p className="text-sm text-secundario">
            {missing > 0n ? `Faltan ${formatAmount(fromStroops(missing))}. ` : "Etapa cubierta. "}
            Todavía no tiene gastos.
          </p>
        )}

        {milestone ? (
          <p className="border-t border-arena/60 pt-3 text-sm">
            <span className="font-semibold">Hito:</span> {milestone.description}{" "}
            <ExplorerLink href={milestone.txUrl}>Ver en Stellar Expert</ExplorerLink>
          </p>
        ) : null}

        {mine !== undefined ? (
          <div className="mt-auto flex items-center justify-between rounded-xl bg-salvia px-4 py-3">
            <span className="font-semibold">Tu aporte</span>
            <span className="cifras font-display text-2xl font-bold">{formatAmount(mine)}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
