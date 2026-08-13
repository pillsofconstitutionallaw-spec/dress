import SchermataAccesso from "@/components/SchermataAccesso";

// La prima cosa che si vede aprendo Dress: due tasti, accedi o iscriviti.
// Chi ha già una sessione salvata viene portato dentro senza passare di qui —
// se ne occupa il componente.
export default function Ingresso() {
  return <SchermataAccesso />;
}
