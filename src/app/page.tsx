import { CaseCard } from "@/components/CaseCard";
import { getCatalogService } from "@/platform/container";

// El catálogo lee de la base de datos en cada visita; no se prerenderiza en la compilación.
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const cases = await getCatalogService().list();

  return (
    <main className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold">Apadrina la recuperación de fauna silvestre</h1>
        <p className="mt-3 max-w-2xl text-lg">
          Elige un caso, apadrínalo y sigue cada paso de su recuperación. Cada aporte y cada hito quedan
          registrados en Stellar, donde cualquiera puede comprobarlos.
        </p>
        <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <li className="rounded-lg bg-white p-3">1. Elige un caso</li>
          <li className="rounded-lg bg-white p-3">2. Apadrina con tu billetera</li>
          <li className="rounded-lg bg-white p-3">3. Sigue su recuperación</li>
        </ol>
      </section>

      <section aria-labelledby="casos">
        <h2 id="casos" className="mb-4 text-xl font-semibold">
          Casos
        </h2>
        {cases.length === 0 ? (
          <p className="text-black/60">Aún no hay casos publicados.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((item) => (
              <CaseCard key={item.code} item={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
