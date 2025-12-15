import { supabaseAdmin } from "../supabase/server-client";
import { ClientType } from "../types/Clients_types";

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
}

export interface CreateClientInput {
  name: string;
  type: ClientType;
  email?: string;
  phone?: string;
  document?: string;
  notes?: string; 
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  id: string;
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id, name, type, email, phone, document, notes")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao listar clientes: ", error);
    throw new Error("Não foi possível listar os clientes.");
  }

  return data as Client[];
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id, name, type, email, phone, document, notes")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar cliente:", error);
    return null;
  }

  return data as Client;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .insert({
      name: input.name,
      type: input.type,
      email: input.email ?? null,
      phone: input.phone ?? null,
      document: input.document ?? null,
      notes: input.notes ?? null,
    })
    .select("id, name, type, email, phone, document, notes")
    .single();

  if (error) {
    console.error("Erro ao criar cliente: ", error);
    throw new Error("Não foi possível criar o cliente.");
  }

  return data as Client;
}

export async function updateClient(input: UpdateClientInput): Promise<Client> {
  const { id, ...rest } = input;

  const { data, error } = await supabaseAdmin
    .from("clients") 
    .update(rest)
    .eq("id", id)
    .select("id, name, type, email, phone, document, notes")
    .single();

  if (error) {
    console.error("Erro ao atualizar cliente: ", error);
    throw new Error("Não foi possível atualizar o cliente.");
  }

  return data as Client;
}
