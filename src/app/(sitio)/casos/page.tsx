import type { Metadata } from "next";
import { CaseRow } from "@/components/casos/CaseRow";
import { getCatalogService } from "@/platform/container";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Casos" };

export default async function CasosPage() {
  const cases = await getCatalogService().listCases();

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <h1 className="text-6xl">Casos</h1>
        <p className="text-lg text-secundario">
          Conoce a los animales que puedes apadrinar y sigue su recuperación paso a paso.
        </p>
      </header>
      {cases.length === 0 ? (
        <p className="text-secundario">Aún no hay casos publicados.</p>
      ) : (
        <div className="space-y-5">
          {cases.map((item) => (
            <CaseRow key={item.code} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
