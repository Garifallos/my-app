// app/api/rooms/leave/route.ts

import { NextRequest, NextResponse } from "next/server";
import { leaveRoom } from "../store";

export async function POST(req: NextRequest) {
  const { room } = await req.json().catch(() => ({ room: null }));

  if (!room) {
    return NextResponse.json(
      { ok: false, reason: "Missing room code" },
      { status: 400 }
    );
  }

  leaveRoom(room);

  return NextResponse.json({ ok: true });
}
