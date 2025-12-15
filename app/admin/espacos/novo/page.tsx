import { NewSpaceForm } from "./space-form";

export default function NewSpacePage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Novo espaço</h1>
        <p className="text-sm text-slate-400">
          Preencha os dados para cadastrar um novo espaço.
        </p>
      </header>

      <NewSpaceForm />
    </section>
  );
}
