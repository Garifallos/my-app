// app/api/rooms/join/route.ts
import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code) {
    return Response.json(
      { ok: false, reason: "Missing room code" },
      { status: 400 }
    );
  }

  let data = rooms.get(code);
  if (!data) {
    data = { players: 0 };
  }

  // επιτρέπουμε μόνο 1 guest (host + 1 guest = 2 παίκτες)
  if (data.players >= 1) {
    return Response.json(
      { ok: false, reason: "Room is full", players: data.players },
      { status: 400 }
    );
  }

  data.players += 1;
  rooms.set(code, data);

  // ενημέρωση host/guest
  await pusherServer.trigger(`room-${code}`, "players-update", {
    players: data.players, // μόνο guests
  });

  return Response.json({ ok: true, players: data.players });
}
