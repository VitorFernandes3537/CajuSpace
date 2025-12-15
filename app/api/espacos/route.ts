import { NextRequest, NextResponse } from "next/server";
import {
  listSpaces,
  createSpace,
  CreateSpaceInput,
  syncSpaceResources,
} from "@/app/lib/repository/spaces.repository";

type PostgresLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isPostgresLikeError(e: unknown): e is PostgresLikeError {
  return typeof e === "object" && e !== null;
}

type CreateBody = Partial<CreateSpaceInput> & {
  resource_ids?: string[];
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get("onlyActive") === "true";

    const spaces = await listSpaces({ onlyActive });
    return NextResponse.json({ spaces });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao listar espaços" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateBody;

    if (!body.name || !body.slug || body.capacity === undefined || body.default_hourly_price === undefined) {
      return NextResponse.json(
        { message: "Campos Obrigatórios: nome, slug, capacidade, valor/hora" },
        { status: 400 }
      );
    }

    const space = await createSpace({
      name: body.name,
      slug: body.slug,
      capacity: Number(body.capacity),
      default_hourly_price: Number(body.default_hourly_price),
      description: body.description ?? null,
      space_type_id: body.space_type_id ?? null,
      image_url: body.image_url ?? null,
      is_active: body.is_active ?? true,
    });

    if (Array.isArray(body.resource_ids)) {
      await syncSpaceResources(space.id, body.resource_ids);
    }

    return NextResponse.json({ ok: true, space }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);

    if (
      isPostgresLikeError(error) && error.code === "23505" &&
      String(error.message ?? "").includes("spaces_slug_key")
    ) {
      return NextResponse.json(
        { message: "Slug já existe. Escolha outro identificador (ex: lab-3-plustech-2)." },
        { status: 409 }
      );
    }

    return NextResponse.json({ message: "Error ao criar espaço" }, { status: 500 });
  }
}