import { supabaseAdmin } from "@/app/lib/supabase/server-client";

export interface SpaceType {
  id: string;
  name: string;
  description?: string | null;
}

export async function listSpaceTypes(): Promise<SpaceType[]> {
  const { data, error } = await supabaseAdmin
    .from("space_types")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao listar tipos de espaço:", error);
    throw new Error("Não foi possível listar os tipos de espaço.");
  }

  return data as SpaceType[];
}

