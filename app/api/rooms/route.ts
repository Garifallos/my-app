// app/api/rooms/reset/route.ts
import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code) {
    return Response.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  rooms.set(code, { players: 0 });

  return Response.json({ ok: true });
}
