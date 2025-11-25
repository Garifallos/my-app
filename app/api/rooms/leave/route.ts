// app/api/rooms/leave/route.ts
import { NextRequest } from "next/server";
import { leaveRoom } from "../store";

export async function POST(req: NextRequest) {
  const { room } = await req.json().catch(() => ({ room: null }));

  if (!room) {
    return Response.json(
      { ok: false, reason: "Missing room code" },
      { status: 200 }
    );
  }

  leaveRoom(room);

  return Response.json({ ok: true }, { status: 200 });
}
