import { NextResponse } from "next/server";
import {getSpaceById, updateSpace, getSpaceResourceIds ,syncSpaceResources} from "@/app/lib/repository/spaces.repository";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "ID ausente" }, { status: 400 });
  }

  const space = await getSpaceById(id);
  if (!space) return NextResponse.json({ error: "Espaço não encontrado" }, { status: 404 });

  const resource_ids = await getSpaceResourceIds(id);
  return NextResponse.json({ space, resource_ids });
}

type PutBody = {
  name?: string;
  capacity?: number | null;
  description?: string | null;
  default_hourly_price?: number;
  space_type_id?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  resource_ids?: string[];
};

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "ID ausente" }, { status: 400 });
  }

  const body = (await req.json()) as PutBody;

  const updated = await updateSpace({
    id,
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(typeof body.capacity === "number" ? { capacity: body.capacity } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.default_hourly_price !== undefined ? { default_hourly_price: body.default_hourly_price } : {}),
    ...(body.space_type_id !== undefined ? { space_type_id: body.space_type_id } : {}),
    ...(body.image_url !== undefined ? { image_url: body.image_url } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
  });

  if (Array.isArray(body.resource_ids)) {
    await syncSpaceResources(id, body.resource_ids);
  }

  return NextResponse.json({ ok: true, space: updated });
}
