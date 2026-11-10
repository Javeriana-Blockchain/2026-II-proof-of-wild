import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ inscribirme?: string }> };

/**
 * Los voluntariados son una sección de la página principal. Los enlaces viejos bajan hasta ella y, si traían
 * `?inscribirme=<id>`, abren la misma inscripción allá.
 */
export default async function VoluntariadosPage({ searchParams }: Props) {
  const { inscribirme } = await searchParams;
  redirect(inscribirme ? `/?inscribirme=${encodeURIComponent(inscribirme)}#voluntariados` : "/#voluntariados");
}
