import { NextRequest, NextResponse } from "next/server";
import { rooms } from "../store";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { room } = await req.json().catch(() => ({ room: null }));

  if (!room) {
    return NextResponse.json(
      { ok: false, reason: "Missing room code" },
      { status: 400 }
    );
  }

  let current = rooms.get(room);

  // Αν δεν υπάρχει → το δημιουργούμε ΣΩΣΤΑ
  if (!current) {
    current = {
      players: 0,
      started: false,
      scores: {}
    };
  }

  // Επιτρέπουμε μόνο 1 guest
  if (current.players >= 1) {
    return NextResponse.json(
      { ok: false, reason: "Room is full", players: current.players },
      { status: 400 }
    );
  }

  current.players += 1;
  rooms.set(room, current);

  await pusherServer.trigger(`room-${room}`, "players-update", {
    players: current.players
  });

  return NextResponse.json(
    { ok: true, players: current.players },
    { status: 200 }
  );
}
