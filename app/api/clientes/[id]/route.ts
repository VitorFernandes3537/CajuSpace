import { NextRequest, NextResponse } from "next/server";
import { getClientById, updateClient } from "@/app/lib/repository/clients.repository";
import { ClientType, CLIENT_TYPES } from "@/app/lib/types/Clients_types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    const client = await getClientById(id);

    if (!client) {
      return NextResponse.json({ message: "Cliente não encontrado" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao buscar cliente" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    const raw = (await req.json()) as {
      name?: string;
      type?: string;
      email?: string;
      phone?: string;
      document?: string;
      notes?: string;
    };

    if (raw.type && !CLIENT_TYPES.includes(raw.type as ClientType)) {
      return NextResponse.json({ message: "Tipo inválido. Use: individual ou company." }, { status: 400 });
    }

    const updated = await updateClient({
      id,
      name: raw.name,
      type: raw.type as ClientType | undefined,
      email: raw.email,
      phone: raw.phone,
      document: raw.document,
      notes: raw.notes,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao atualizar cliente" }, { status: 500 });
  }
}
