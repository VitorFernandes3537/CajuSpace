"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Field } from "@/app/components/ui/field-label";

type SpaceType = {
  id: string,
  name: string,
  description?: string | null
};


export function NewSpaceForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<SpaceType[]>([]);


  useEffect(() => {
    async function fetchTypes() {
      try {
        const res = await fetch("/api/spaces-types");
        if (!res.ok) return;

        const data = (await res.json()) as SpaceType[];
        setTypes(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchTypes();
  }, [])

  const [resources, setResources] = useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/resources")
      .then(r => r.json())
      .then(j => setResources(j.resources ?? []))
      .catch(() => setResources([]));
  }, []);

  function toggleResource(id: string) {
    setSelectedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const slug = String(formData.get("slug") || "").trim();
    const capacity = Number(formData.get("capacity") || 0);
    const price = Number(formData.get("price") || 0);
    const description = String(formData.get("description") || "").trim();
    const spaceTypeId = String(formData.get("space_type_id") || "").trim() || null;

    if (!name || !slug || !capacity || !price) {
      setError("Preencha nome, slug, capacidade e valor/hora.");
      setLoading(false);
      return;
    }
    const payload = {
      name,
      slug,
      capacity,
      default_hourly_price: price,
      space_type_id: spaceTypeId || null,
      description: description || null,
      resource_ids: selectedResourceIds,
    };

    const res = await fetch("/api/espacos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Erro ao salvar.");
      setLoading(false);
      return;
    }


    router.push("/admin/espacos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-700/50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" placeholder="Ex: Lab 2 PlusTech" />
      </Field>

      <Field
        label="Slug"
        htmlFor="slug"
        helperText="Identificador para URL, ex: lab-2-plustech"
      >
        <Input id="slug" name="slug" placeholder="lab-2-plustech" />
      </Field>

      <Field label="Capacidade" htmlFor="capacity">
        <Input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          placeholder="Ex: 20"
        />
      </Field>

      <Field label="Valor por hora (R$)" htmlFor="price">
        <Input
          id="price"
          name="price"
          type="number"
          min={0}
          step="0.5"
          placeholder="Ex: 80"
        />
      </Field>

      <Field label="Tipo de espaço" htmlFor="space_type_id" helperText="Ex: Coworking, Laboratório, Auditório...">
        <select
          id="space_type_id"
          name="space_type_id"
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/70 focus:border-brand-blue/60"
          defaultValue=""
        >
          <option value="">Selecione um tipo</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Recursos</p>

        {resources.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum recurso cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {resources.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={selectedResourceIds.includes(r.id)}
                  onChange={() => toggleResource(r.id)}
                />
                <span>{r.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>


      <Field label="Descrição" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={4}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/70 focus:border-brand-blue/60"
          placeholder="Descreva os recursos, usos e diferenciais deste espaço..."
        />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar espaço"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/espacos")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
