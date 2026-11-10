import { redirect } from "next/navigation";

/** Los casos son una sección de la página principal; los enlaces viejos bajan hasta ella. */
export default function CasosPage() {
  redirect("/#casos");
}
