import { NextRequest, NextResponse } from "next/server";
import { rooms } from "../store";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    // Πρώτα παίρνουμε το raw body επειδή στο Vercel συχνά κόβεται το json()
    const raw = await req.text();
    let data: any = {};

    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error in join route:", e);
      return NextResponse.json(
        { ok: false, reason: "Invalid JSON" },
        { status: 400 }
      );
    }

    const room = data.room;
    if (!room) {
      return NextResponse.json(
        { ok: false, reason: "Missing room code" },
        { status: 400 }
      );
    }

    let current = rooms.get(room);

    // Αν δεν υπάρχει → το δημιουργούμε σωστά
    if (!current) {
      current = { players: 0, started: false, scores: {} };
    }

    // Επιτρέπουμε μόνο 1 guest
    if (current.players >= 1) {
      return NextResponse.json(
        { ok: false, reason: "Room is full", players: current.players },
        { status: 200 }
      );
    }

    current.players += 1;
    rooms.set(room, current);

    // Ενημέρωση host
    await pusherServer.trigger(`room-${room}`, "players-update", {
      players: current.players,
    });

    return NextResponse.json(
      { ok: true, players: current.players },
      { status: 200 }
    );
  } catch (err) {
    console.error("JOIN ROUTE FATAL ERROR:", err);
    return NextResponse.json(
      { ok: false, reason: "Server error" },
      { status: 500 }
    );
  }
}
