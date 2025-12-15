import { supabaseAdmin } from "@/app/lib/supabase/server-client";

export interface Reservation {
  id: string;
  space_id: string;
  client_id: string;
  start_at: string;
  end_at: string;   
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  people_count: number | null;
  usage_purpose: string | null;
  total_price: number | null;
  source: "web" | "operator" | "request_approved";
  created_by_staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationInput {
  space_id: string;
  client_id: string;
  start_at: string; 
  end_at: string;  
  status?: Reservation["status"];
  people_count?: number | null;
  usage_purpose?: string | null;
  total_price?: number | null;
  source?: Reservation["source"];
  created_by_staff_id?: string | null;
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .insert({
      space_id: input.space_id,
      client_id: input.client_id,
      start_at: input.start_at,
      end_at: input.end_at,
      status: input.status ?? "pending",
      people_count: input.people_count ?? null,
      usage_purpose: input.usage_purpose ?? null,
      total_price: input.total_price ?? null,
      source: input.source ?? "web",
      created_by_staff_id: input.created_by_staff_id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao criar reserva:", error);
    const msg = (error as { message?: string }).message ?? "Não foi possível criar a reserva.";
    throw new Error(msg);
  }

  return data as Reservation;
}

export async function listReservationsBySpaceAndDay(spaceId: string, dayISO: string): Promise<Reservation[]> {
  const start = `${dayISO}T00:00:00.000Z`;
  const end = `${dayISO}T23:59:59.999Z`;

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select("*")
    .eq("space_id", spaceId)
    .gte("start_at", start)
    .lte("start_at", end)
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Erro ao listar reservas:", error);
    throw new Error("Não foi possível listar reservas.");
  }

  return (data ?? []) as Reservation[];
}

export async function listReservationsBySpaceRange(spaceId: string, startISO: string, endISO: string): Promise<Reservation[]> {
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select("*")
    .eq("space_id", spaceId)
    .lt("start_at", endISO)
    .gt("end_at", startISO)  
    .in("status", ["pending", "confirmed"])
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar reservas por range:", error);
    throw new Error("Não foi possível buscar reservas.");
  }

  return (data ?? []) as Reservation[];
}
