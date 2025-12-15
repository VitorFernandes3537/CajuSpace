import { NextResponse } from "next/server";
import { listSpaceTypes } from "@/app/lib/repository/space-types.repository";

export async function GET(){
    try{
        const types = await listSpaceTypes();
        return NextResponse.json(types);

    }catch(error) {
        console.error(error);
        return NextResponse.json(
            {message: "Erro ao listar tipos de espaço"},
            {status: 500}
        );
    }
}