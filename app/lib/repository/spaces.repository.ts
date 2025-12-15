import { supabaseAdmin } from "../supabase/server-client";

export interface Space {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  description: string | null;
  default_hourly_price: number;
  space_type_id: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface CreateSpaceInput {
  name: string;
  slug: string;
  capacity: number;
  description?: string | null;
  default_hourly_price: number;
  space_type_id?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface UpdateSpaceInput extends Partial<CreateSpaceInput> {
  id: string;
}

// LIST
export async function listSpaces(opts?: { onlyActive?: boolean }): Promise<Space[]> {
  let res = supabaseAdmin
    .from("spaces")
    .select("id, name, slug, capacity, description, default_hourly_price, space_type_id, image_url, is_active")
    .order("name", { ascending: true });

  if (opts?.onlyActive) {
    res = res.eq("is_active", true);
  }

  const { data, error } = await res;

  if (error) {
    console.error("Erro ao listar espaços: ", error);
    throw new Error("Não foi possível listar os espaços.");
  }
  return data as Space[];
}

export type SpaceWithResources = Space & {
  resources: Array<{ id: string; name: string }>;
};

export async function listSpacesWithResources(opts?: {
  onlyActive?: boolean;
  limitResourcesPerSpace?: number; // ex: 5
}): Promise<SpaceWithResources[]> {
  const spaces = await listSpaces({ onlyActive: opts?.onlyActive });

  if (!spaces.length) return [];

  const spaceIds = spaces.map((s) => s.id);

  const { data: links, error: linksErr } = await supabaseAdmin
    .from("space_resources")
    .select("space_id, resource_id")
    .in("space_id", spaceIds);

  if (linksErr) {
    console.error("Erro ao buscar vínculos space_resources:", linksErr);
    throw new Error("Não foi possível buscar recursos dos espaços.");
  }

  const resourceIds = Array.from(new Set((links ?? []).map((x) => x.resource_id as string)));
  if (!resourceIds.length) {
    return spaces.map((s) => ({ ...s, resources: [] }));
  }

  const { data: resources, error: resErr } = await supabaseAdmin
    .from("resources")
    .select("id, name")
    .in("id", resourceIds)
    .order("name", { ascending: true });

  if (resErr) {
    console.error("Erro ao buscar resources:", resErr);
    throw new Error("Não foi possível buscar recursos.");
  }

  const resourceById = new Map<string, { id: string; name: string }>();
  (resources ?? []).forEach((r) => resourceById.set(r.id as string, { id: r.id as string, name: r.name as string }));

  const resourceIdsBySpace = new Map<string, string[]>();
  (links ?? []).forEach((l) => {
    const sid = String(l.space_id);
    const rid = String(l.resource_id);
    const arr = resourceIdsBySpace.get(sid) ?? [];
    arr.push(rid);
    resourceIdsBySpace.set(sid, arr);
  });

  const max = opts?.limitResourcesPerSpace ?? 6;

  return spaces.map((s) => {
    const ids = resourceIdsBySpace.get(s.id) ?? [];
    const resList = ids
      .map((id) => resourceById.get(id))
      .filter(Boolean) as Array<{ id: string; name: string }>;

    return {
      ...s,
      resources: resList.slice(0, max),
    };
  });
}

export async function getSpaceById(id: string): Promise<Space | null> {
  const { data, error } = await supabaseAdmin
    .from("spaces")
    .select("id, name, slug, capacity, description, default_hourly_price, space_type_id, image_url, is_active")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar espaço: ", error);
    return null;
  }

  return data as Space;
}

// CREATE
export async function createSpace(input: CreateSpaceInput): Promise<Space> {
  const { data, error } = await supabaseAdmin
    .from("spaces")
    .insert({
      name: input.name,
      slug: input.slug,
      capacity: input.capacity,
      description: input.description ?? null,
      default_hourly_price: input.default_hourly_price,
      space_type_id: input.space_type_id ?? null,
      image_url: input.image_url ?? null,
      is_active: input.is_active ?? true,
    })
    .select("id, name, slug, capacity, description, default_hourly_price, space_type_id, image_url, is_active")
    .single();

  if (error) {
    console.error("Erro ao criar espaço: ", error);
    throw new Error("Não foi possível criar o espaço.");
  }

  return data as Space;
}

// UPDATE
export async function updateSpace(input: UpdateSpaceInput): Promise<Space> {
  const { id, ...rest } = input;

  const { data, error } = await supabaseAdmin
    .from("spaces")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, slug, capacity, description, default_hourly_price, space_type_id, image_url, is_active")
    .single();

  if (error) {
    console.error("Erro ao atualizar espaço: ", error);
    throw new Error("não foi possível atualizar o espaço.");
  }
  return data as Space;
}

export async function getSpaceResourceIds(spaceId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("space_resources")
    .select("resource_id")
    .eq("space_id", spaceId);

  if (error) {
    console.error("Erro ao buscar recursos do espaço:", error);
    throw new Error("Não foi possível buscar recursos do espaço.");
  }
  return (data ?? []).map((r) => r.resource_id as string);
}

export async function syncSpaceResources(spaceId: string, resourceIds: string[]) {
  const del = await supabaseAdmin.from("space_resources").delete().eq("space_id", spaceId);
  if (del.error) {
    console.error("Erro ao limpar recursos do espaço:", del.error);
    throw new Error("Não foi possível atualizar recursos do espaço.");
  }

  if (!resourceIds?.length) return { ok: true, inserted: 0 };

  const rows = resourceIds.map((rid) => ({
    space_id: spaceId,
    resource_id: rid,
  }));

  const ins = await supabaseAdmin.from("space_resources").insert(rows);
  if (ins.error) {
    console.error("Erro ao inserir recursos do espaço:", ins.error);
    throw new Error("Não foi possível atualizar recursos do espaço.");
  }

  return { ok: true, inserted: rows.length };
}
