// app/api/rooms/join/route.ts
import { NextRequest } from "next/server";
import { rooms } from "../store";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { room } = await req.json().catch(() => ({ room: null }));

  if (!room) {
    return Response.json(
      { ok: false, reason: "Missing room code" },
      { status: 200 }
    );
  }

  let current = rooms.get(room);

  // Αν δεν υπάρχει room → το δημιουργούμε
  if (!current) {
    current = { players: 0, started: false, scores: {} };

  }

  // Επιτρέπουμε μόνο 1 guest
  if (current.players >= 1) {
    return Response.json(
      { ok: false, reason: "Room is full", players: current.players },
      { status: 200 }
    );
  }

  current.players += 1;
  rooms.set(room, current);

  await pusherServer.trigger(`room-${room}`, "players-update", {
    players: current.players,
  });

  return Response.json(
    { ok: true, players: current.players },
    { status: 200 }
  );
}
