"use client";

import Image from "next/image";
import { stageStatusLabel } from "@/app/_lib/labels";
import { IconoEtapa, stageKind } from "@/components/iconos";
import { Reveal } from "@/components/movimiento/Reveal";
import { Chip, ExplorerLink, ProgressBar, ValidationChip } from "@/components/ui";
import { useT } from "@/i18n/cliente";
import { fromStroops, toStroops } from "@/lib/amount";
import type { PublicStage } from "@/modules/catalog";

/**
 * Línea de tiempo del tratamiento como un sendero vertical: las etapas que ya empezaron muestran su foto, lo cubierto,
 * la factura y el pago en Stellar Expert y, si hay billetera conectada, «Tu aporte»; las pendientes quedan en una
 * línea cada una, a la espera de que se cubra la anterior.
 */
export function StageTimeline({
  stages,
  myAllocations,
}: {
  stages: PublicStage[];
  myAllocations?: Record<number, string>;
}) {
  return (
    <ol className="relative space-y-4">
      <span
        aria-hidden
        className="absolute top-8 bottom-8 left-[2.25rem] border-l-2 border-dashed border-bosque/35 sm:left-[3.75rem]"
      />
      {stages.map((stage, i) => (
        <Reveal as="li" variant="pop" delay={i} key={stage.position} className="relative">
          {stage.status === "pendiente" ? (
            <PendingRow stage={stage} />
          ) : (
            <StageRow stage={stage} mine={myAllocations?.[stage.position]} />
          )}
        </Reveal>
      ))}
    </ol>
  );
}

function StageRow({ stage, mine }: { stage: PublicStage; mine?: string }) {
  const { t, rich, formatAmount } = useT();
  const missing = toStroops(stage.cost) - toStroops(stage.covered);
  const percent = Number((toStroops(stage.covered) * 100n) / (toStroops(stage.cost) || 1n));
  const expense = stage.expenses.at(-1);
  const milestone = stage.milestones.at(-1);
  const kind = stageKind(stage.name);
  const here = stage.status === "en_curso";

  return (
    <article
      className={`group/etapa grid gap-4 rounded-[24px] bg-white p-3 ring-1 transition-[transform,--tw-ring-color] duration-300 ease-(--ease-spring) hover:-translate-y-0.5 hover:ring-bosque/60 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:gap-6 sm:p-4 ${here ? "ring-2 ring-bosque" : "ring-arena/70"}`}
    >
      <div className="relative h-28 w-[4.5rem] overflow-hidden rounded-[18px] bg-salvia sm:w-full">
        {stage.photoUrl ? (
          <Image
            src={stage.photoUrl}
            alt={t("casos.etapas.fotoAlt", { n: stage.position, nombre: stage.name })}
            fill
            sizes="(min-width: 640px) 120px, 72px"
            className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/etapa:scale-[1.08]"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-texto">
            <IconoEtapa kind={kind} className="h-7 w-7" />
          </span>
        )}
      </div>

      <div className="min-w-0 space-y-3 sm:py-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-2xl leading-tight font-semibold">
            <span className="cifras text-bosque">{stage.position}</span> · {stage.name}
          </h3>
          <Chip tone={stage.status === "completada" ? "logro" : "etapa"}>{stageStatusLabel(t, stage.status)}</Chip>
        </div>
        {stage.covers ? <p className="text-secundario">{stage.covers}</p> : null}

        <div className="max-w-md space-y-1.5">
          <p className="cifras text-sm">
            {rich(
              "casos.cubiertoDe",
              { b: (s) => <strong className="text-base">{s}</strong> },
              { cubierto: formatAmount(stage.covered, "").trim(), costo: formatAmount(stage.cost) },
            )}
            {missing > 0n ? (
              <span className="text-secundario"> {t("casos.etapas.faltan", { monto: formatAmount(fromStroops(missing)) })}</span>
            ) : null}
          </p>
          <ProgressBar percent={percent} label={t("casos.etapas.progresoAria", { n: stage.position })} />
        </div>

        {expense ? (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <ValidationChip level={expense.validationLevel} />
            <a href={expense.invoiceUrl} target="_blank" rel="noreferrer" className="enlace">
              {t("casos.factura")}
            </a>
            <ExplorerLink href={expense.txUrl} />
          </p>
        ) : (
          <p className="text-sm text-secundario">
            {missing > 0n ? t("casos.etapas.sinGastos") : t("casos.etapas.cubiertaSinGastos")}
          </p>
        )}

        {milestone ? (
          <p className="border-t border-arena/60 pt-3 text-sm">
            <span className="font-semibold">{t("casos.etapas.hito")}</span> {milestone.description}{" "}
            <ExplorerLink href={milestone.txUrl}>{t("casos.verEnStellarExpert")}</ExplorerLink>
          </p>
        ) : null}
      </div>

      {mine !== undefined ? (
        <div className="flex items-center justify-between gap-4 self-center rounded-[18px] bg-salvia px-5 py-4 sm:flex-col sm:items-end sm:justify-center">
          <span className="font-semibold">{t("casos.tuAporte")}</span>
          <span className="cifras font-display text-3xl font-bold">{formatAmount(mine)}</span>
        </div>
      ) : null}
    </article>
  );
}

/** Etapa pendiente: una sola línea del sendero, con su costo y la espera. */
function PendingRow({ stage }: { stage: PublicStage }) {
  const { t, rich, formatAmount } = useT();
  const kind = stageKind(stage.name);
  return (
    <div className="flex items-center gap-4 rounded-[20px] px-3 py-2 transition-colors duration-200 hover:bg-white/60 sm:gap-6 sm:px-4">
      <span className="flex h-12 w-[4.5rem] shrink-0 items-center justify-center sm:w-[7.5rem]">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-arena bg-crema text-secundario">
          <IconoEtapa kind={kind} className="h-5 w-5" />
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="font-display text-xl font-semibold text-secundario">
          <span className="cifras">{stage.position}</span> · {stage.name}
        </h3>
        <span className="cifras text-sm text-secundario">
          {rich(
            "casos.cubiertoDe",
            { b: (s) => <strong className="text-texto">{s}</strong> },
            { cubierto: formatAmount(stage.covered, "").trim(), costo: formatAmount(stage.cost) },
          )}
        </span>
        <span className="text-sm text-secundario">
          {stage.waitingForPrevious
            ? t("casos.etapas.espera", { n: stage.position - 1 })
            : stageStatusLabel(t, stage.status)}
        </span>
      </div>
    </div>
  );
}
