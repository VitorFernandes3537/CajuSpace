import { NextRequest, NextResponse } from "next/server";
import {
  listClients,
  createClient
} from "@/app/lib/repository/clients.repository";
import { ClientType, CLIENT_TYPES } from "@/app/lib/types/Clients_types";

export async function GET() {
  try {
    const clients = await listClients();
    return NextResponse.json(clients);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao listar clientes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json()) as {
      name?: string;
      type?: string;
      email?: string;
      phone?: string;
      document?: string;
      notes?: string;
    };

    if (!raw.name) {
      return NextResponse.json(
        { message: "Campo obrigatório: nome" },
        { status: 400 }
      );
    }

    if (!raw.type || !CLIENT_TYPES.includes(raw.type as ClientType)) {
      return NextResponse.json(
        { message: "Tipo inválido. Use: individual ou company." },
        { status: 400 }
      );
    }

    const client = await createClient({
      name: raw.name,
      type: raw.type as ClientType,
      email: raw.email,
      phone: raw.phone,
      document: raw.document,
      notes: raw.notes,
    });

    return NextResponse.json(client, { status: 201 });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}
