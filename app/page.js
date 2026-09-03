"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SchermataAccesso from "@/components/SchermataAccesso";
import { doveMandare } from "@/lib/session";

// La prima cosa che si vede aprendo Dress: due tasti, accedi o iscriviti.
// Chi ha già una sessione salvata viene portato dentro senza passare di qui —
// se ne occupa il componente.
//
// E chi arriva da una mail viene portato dove serve. I link di conferma e di
// recupero password non atterrano sulla pagina giusta: Supabase rimanda
// all'indirizzo del sito e basta, qualunque cosa gli si chieda. Chi aveva
// dimenticato la password finiva qui, veniva fatto entrare in silenzio — la
// sessione di recupero il client Supabase la apre da solo — e nessuno gli
// chiedeva mai la password nuova. Quella dimenticata restava la sua.
//
// Il controllo va fatto PRIMA di mostrare la schermata d'accesso: gli effetti
// dei figli girano prima di quelli del padre, e la schermata d'accesso tocca
// il client Supabase, che il frammento se lo mangia. Per questo qui non si
// disegna niente finché non si è deciso — è un fotogramma, non si vede.
export default function Ingresso() {
  const router = useRouter();
  const [deciso, setDeciso] = useState(false);

  useEffect(() => {
    const dove = doveMandare(window.location.hash) || doveMandare(window.location.search);
    if (dove) router.replace(dove + window.location.hash + window.location.search);
    else setDeciso(true);
  }, [router]);

  if (!deciso) return null;
  return <SchermataAccesso />;
}
