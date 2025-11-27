// app/api/rooms/join/route.ts
import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code) {
    return Response.json({ ok: false, reason: "Missing room code" }, { status: 400 });
  }

  let room = rooms.get(code);

  // If room doesn't exist → create it
  if (!room) {
    room = { players: 0 };
    rooms.set(code, room);
  }

  // ❗ FIX: allow exactly 1 guest (host is not counted)
  if (room.players >= 1) {
    return Response.json(
      { ok: false, reason: "Room is full" },
      { status: 400 }
    );
  }

  // Guest joins
  room.players += 1;
  rooms.set(code, room);

  // Notify host
  await pusherServer.trigger(`room-${code}`, "players-update", {
    players: room.players,
  });

  return Response.json({ ok: true, players: room.players });
}
