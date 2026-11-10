"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/billetera/WalletProvider";
import type { PublicStage } from "@/modules/catalog";
import { StageTimeline } from "./StageTimeline";

/**
 * Línea de tiempo personalizada: con la billetera conectada, cada etapa muestra cuánto de su costo pagó
 * el aporte de esa billetera. Sin billetera (o sin aportes a este caso) se ve igual, sin «Tu aporte».
 */
export function PersonalizedTimeline({ caseCode, stages }: { caseCode: string; stages: PublicStage[] }) {
  const { address } = useWallet();
  const [mine, setMine] = useState<Record<number, string> | null>(null);

  useEffect(() => {
    if (!address) return setMine(null);
    let alive = true;
    fetch(`/api/casos/${caseCode}/mi-aporte?cuenta=${address}`)
      .then((r) => (r.ok ? (r.json() as Promise<Record<number, string>>) : {}))
      .then((data) => alive && setMine(Object.keys(data).length > 0 ? data : null))
      .catch(() => alive && setMine(null));
    return () => {
      alive = false;
    };
  }, [address, caseCode]);

  // Con aporte, las etapas que no recibieron nada de esta billetera muestran 0.
  const allocations = mine ? Object.fromEntries(stages.map((s) => [s.position, mine[s.position] ?? "0"])) : undefined;

  return (
    <div className="space-y-3">
      {mine ? (
        <p className="ml-auto flex w-fit items-center gap-2 rounded-full bg-salvia px-4 py-2 text-sm font-semibold">
          <span aria-hidden className="h-2 w-2 rounded-full bg-profundo" />
          Billetera conectada: se muestra tu aporte
        </p>
      ) : null}
      <StageTimeline stages={stages} myAllocations={allocations} />
    </div>
  );
}
