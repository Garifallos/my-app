// app/api/quiz/end/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { rooms, deleteRoom } from "@/app/api/rooms/store";

export async function POST(req: NextRequest) {
  const { room } = await req.json().catch(() => ({ room: null }));

  if (!room) {
    return NextResponse.json(
      { ok: false, error: "Missing room code" },
      { status: 400 }
    );
  }

  // Delete room from memory
  deleteRoom(room);

  // Broadcast end event to clients
  await pusherServer.trigger(room, "end", {
    message: "Room deleted",
  });

  return NextResponse.json({ ok: true });
}
