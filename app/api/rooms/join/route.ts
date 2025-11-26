import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { room } = await req.json();   // ⬅️ ΔΙΟΡΘΩΘΗΚΕ

  if (!room) {
    return Response.json(
      { ok: false, reason: "Missing room" },
      { status: 400 }
    );
  }

  // get existing or create new room
  let data = rooms.get(room);
  if (!data) {
    data = { players: 0 };
  }

  // allow ONLY 1 guest (host + guest)
  if (data.players >= 1) {
    return Response.json(
      { ok: false, reason: "Room is full", players: data.players },
      { status: 400 }
    );
  }

  data.players += 1;
  rooms.set(room, data);

  // notify host of player join
  await pusherServer.trigger(`room-${room}`, "players-update", {
    players: data.players,
  });

  return Response.json({
    ok: true,
    players: data.players,
  });
}
