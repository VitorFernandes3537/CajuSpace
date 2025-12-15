"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { supabaseBrowser } from "@/app/lib/supabase/browser-client";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useToast } from "@/app/components/ui/toast";

type Space = {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  description: string | null;
  default_hourly_price: number;
  space_type_id: string | null;
  image_url: string | null;
  is_active: boolean;
};

type Resource = {
  id: string;
  name: string;
  description?: string | null;
};

export default function EditSpaceModal({ open, space, onClose, onSaved }: {
  open: boolean;
  space: Space;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description ?? "");
  const [capacity, setCapacity] = useState<number | "">(space.capacity ?? "");
  const [price, setPrice] = useState<number | "">(space.default_hourly_price ?? "");
  const [imageUrl, setImageUrl] = useState(space.image_url ?? "");
  const [isActive, setIsActive] = useState<boolean>(space.is_active ?? true);

  const [resources, setResources] = useState<Resource[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!space?.id) return;

    (async () => {
      const rr = await fetch("/api/resources").then((r) => r.json());
      setResources(rr.resources ?? []);

      const sr = await fetch(`/api/espacos/${space.id}`).then((r) => r.json());
      const ids: string[] = sr.resource_ids ?? [];
      setSelected(new Set(ids));
    })().catch(() => {
      setResources([]);
      setSelected(new Set());
    });
  }, [open, space.id]);

  useEffect(() => {
    if (!open) return;
    setName(space.name);
    setDescription(space.description ?? "");
    setCapacity(space.capacity ?? "");
    setPrice(space.default_hourly_price ?? "");
    setImageUrl(space.image_url ?? "");
    setIsActive(space.is_active ?? true);
  }, [open, space]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  async function uploadToStorage(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${space.id}/${Date.now()}.${ext}`;

      const up = await supabaseBrowser.storage
        .from("spaces")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (up.error) throw new Error(up.error.message);

      const pub = supabaseBrowser.storage.from("spaces").getPublicUrl(path);
      const url = pub.data.publicUrl;
      setImageUrl(url);
      return url;
      
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/espacos/${space.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description === "" ? null : description,
          default_hourly_price: price === "" ? 0 : Number(price),
          image_url: imageUrl === "" ? null : imageUrl,
          is_active: isActive,
          resource_ids: selectedIds,
          ...(capacity === "" ? {} : { capacity: Number(capacity) })
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Falha ao salvar.");

      onClose();
      onSaved();
    } catch (err) {

      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      toast.error(msg);

    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editar espaço</h2>
          <button
            onClick={onClose}
            className="text-sm opacity-70 hover:opacity-100"
            type="button"
          >
            Fechar
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <div className="text-sm mb-1 opacity-80">Nome</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <div className="text-sm mb-1 opacity-80">Descrição</div>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm mb-1 opacity-80">Capacidade</div>
              <Input
                type="number"
                value={capacity}
                onChange={(e) =>
                  setCapacity(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <div>
              <div className="text-sm mb-1 opacity-80">Preço/hora</div>
              <Input
                type="number"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
          </div>

          <div>
            <div className="text-sm mb-1 opacity-80">Imagem</div>

            <div className="flex items-center gap-3">
              <Input
                placeholder="URL da imagem (auto após upload)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return;
                  try {
                    await uploadToStorage(f)
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Falha no upload."
                    toast.error(msg)
                  } finally {
                    if (fileRef.current) fileRef.current.value = ""
                  }
                }}
              />

              <Button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Enviando..." : "Upload"}
              </Button>
            </div>

            {imageUrl && (
              <p className="text-xs text-slate-400 mt-1 break-all">{imageUrl}</p>
            )}
          </div>


          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="is_active" className="text-sm">
              Ativo para reserva
            </label>
          </div>

          <div>
            <div className="text-sm mb-2 opacity-80">Recursos</div>
            <div className="grid grid-cols-2 gap-2">
              {resources.map((r) => {
                const checked = selected.has(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        });
                      }}
                    />
                    <span>{r.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={loading || uploading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
