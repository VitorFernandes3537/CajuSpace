import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-client";

type espacos = {
  start_at: string;
  end_at: string;
  estimated_price: number;
};

function iso(d: Date) {
  return d.toISOString();
}

// Espera "YYYY-MM-DD".
function parseDayUTC(dateStr: string) {
  if (dateStr.length !== 10) return null;
  const d = new Date(`${dateStr}T00:00:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "08:00" ou "08:00:00" -> minutos desde 00:00
function timeToMinutes(t: string) {
  const parts = t.split(":");
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  return hh * 60 + mm;
}

// Converte minutos desde á meia-noite em Date respeitando o -03:00 do dayUTC
function minutesFromMidnightToUTCDate(dayUTC: Date, minutes: number) {
  const d = new Date(dayUTC);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const spaceId = searchParams.get("space_id") ?? "";
  const dateStr = searchParams.get("date") ?? "";
  const durationMin = Number(searchParams.get("duration") ?? "0");

  if (!spaceId) {
    return NextResponse.json({ error: "space_id is required" }, { status: 400 });
  }

  const dayUTC = parseDayUTC(dateStr);
  if (!dayUTC) {
    return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD" }, { status: 400 });
  }

  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return NextResponse.json({ error: "Invalid duration (minutes)" }, { status: 400 });
  }

  // 1 - Configurações globais: horário padrão + tamanho do passo dos espacos
  const settingsRes = await supabaseAdmin
    .from("system_settings")
    .select("default_open_time, default_close_time, slot_duration_minutes")
    .eq("id", 1)
    .single();

  const defaultOpen = settingsRes.data?.default_open_time ?? "08:00:00";
  const defaultClose = settingsRes.data?.default_close_time ?? "22:00:00";
  const stepMin = Number(settingsRes.data?.slot_duration_minutes ?? 60);

  // 2 - Horário de funcionamento do espaço no dia da semana (fallback para o padrão global)
  const weekday = dayUTC.getUTCDay(); // 0=domingo
  const ohRes = await supabaseAdmin
    .from("opening_hours")
    .select("start_time, end_time, is_closed")
    .eq("space_id", spaceId)
    .eq("weekday", weekday)
    .maybeSingle();

  // Se o espaço estiver marcado como fechado naquele dia, não há espacos
  if (ohRes.data?.is_closed) {
    return NextResponse.json({ espacos: [] as espacos[] });
  }

  const openTime = ohRes.data?.start_time ?? defaultOpen;
  const closeTime = ohRes.data?.end_time ?? defaultClose;

  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);

  if (!Number.isFinite(openMin) || !Number.isFinite(closeMin) || openMin >= closeMin) {
    return NextResponse.json({ espacos: [] as espacos[] });
  }

  const workStart = minutesFromMidnightToUTCDate(dayUTC, openMin);
  const workEnd = minutesFromMidnightToUTCDate(dayUTC, closeMin);

  // 3 - Pega o preço/hora do espaço para estimar o valor por slot (card)
  const spaceRes = await supabaseAdmin
    .from("spaces")
    .select("default_hourly_price")
    .eq("id", spaceId)
    .single();

  const hourlyPrice = Number(spaceRes.data?.default_hourly_price ?? 0);

  // 4 - Busca intervalos "ocupados" dentro do expediente:
  // reservas (pending/confirmed)
  // bloqueios (blackout_periods)
  const workStartISO = iso(workStart);
  const workEndISO = iso(workEnd);

  const reservationsRes = await supabaseAdmin
    .from("reservations")
    .select("start_at, end_at")
    .eq("space_id", spaceId)
    .lt("start_at", workEndISO)
    .gt("end_at", workStartISO)
    .in("status", ["pending", "confirmed"]);

  const blackoutsRes = await supabaseAdmin
    .from("blackout_periods")
    .select("start_at, end_at")
    .eq("space_id", spaceId)
    .lt("start_at", workEndISO)
    .gt("end_at", workStartISO);

  const busy: Array<{ start: Date; end: Date }> = [];

  for (const r of reservationsRes.data ?? []) {
    busy.push({ start: new Date(r.start_at), end: new Date(r.end_at) });
  }
  for (const b of blackoutsRes.data ?? []) {
    busy.push({ start: new Date(b.start_at), end: new Date(b.end_at) });
  }

  // 5 - Gera os espacos "testando" cada horário em passos fixos.
  // Regra de colisão (overlap): espacostart < busyEnd AND slotEnd > busyStart
  const espacos: espacos[] = [];

  const durationMs = durationMin * 60 * 1000;
  const stepMs = stepMin * 60 * 1000;

  let cursor = new Date(workStart);

  while (cursor.getTime() + durationMs <= workEnd.getTime()) {
    const slotEnd = new Date(cursor.getTime() + durationMs);

    const overlaps = busy.some((b) => cursor < b.end && slotEnd > b.start);

    if (!overlaps) {
      const estimated_price = Number((hourlyPrice * (durationMin / 60)).toFixed(2));

      espacos.push({
        start_at: iso(cursor),
        end_at: iso(slotEnd),
        estimated_price,
      });
    }

    cursor = new Date(cursor.getTime() + stepMs);
  }
  return NextResponse.json({ espacos });
}
