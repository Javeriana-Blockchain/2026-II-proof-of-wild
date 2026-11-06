import type { Metadata } from "next";
import { requireActor } from "@/app/_lib/auth";

export const metadata: Metadata = { title: "Portal" };

export default async function PortalHome() {
  const actor = await requireActor();

  return (
    <main className="space-y-3">
      <h1 className="text-2xl font-semibold">Portal</h1>
      {actor.role === "center" ? (
        <p>Aquí podrás registrar gastos con su soporte y los hitos de recuperación de tus casos.</p>
      ) : null}
      {actor.role === "validator" ? <p>Aquí podrás revisar y firmar los gastos y los hitos de tu centro.</p> : null}
      {actor.role === "admin" ? <p>Aquí podrás aprobar centros y revisar reportes.</p> : null}
      <p className="text-sm text-black/60">Estas pantallas están por construir (RF-GAS-01, RF-HIT-01, RF-VAL-01).</p>
    </main>
  );
}
