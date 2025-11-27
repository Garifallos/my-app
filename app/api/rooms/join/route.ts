// app/api/rooms/join/route.ts
import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return Response.json(
        { ok: false, reason: "Missing room code" },
        { status: 400 }
      );
    }

    let room = rooms.get(code);

    // ⚠️ If host never created room → create it now
    if (!room) {
      room = { players: 0 };
      rooms.set(code, room);
    }

    // ⚠️ Only 1 guest allowed
    if (room.players >= 1) {
      return Response.json(
        { ok: false, reason: "Room is full" },
        { status: 400 }
      );
    }

    // Register guest
    room.players += 1;
    rooms.set(code, room);

    // Notify host
    await pusherServer.trigger(`room-${code}`, "players-update", {
      players: room.players,
    });

    return Response.json({ ok: true, players: room.players });
  } catch (err) {
    return Response.json(
      { ok: false, reason: "Server error" },
      { status: 500 }
    );
  }
}
