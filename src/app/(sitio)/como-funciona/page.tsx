import { redirect } from "next/navigation";

/** «Cómo funciona» es una sección de la página principal; los enlaces viejos bajan hasta ella. */
export default function ComoFuncionaPage() {
  redirect("/#como-funciona");
}
