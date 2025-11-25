import { NextRequest, NextResponse } from "next/server";
import { rooms } from "../store";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    let body: any;

    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, reason: "Invalid JSON" },
        { status: 400 }
      );
    }

    const room = body.room;
    if (!room) {
      return NextResponse.json(
        { ok: false, reason: "Missing room" },
        { status: 400 }
      );
    }

    let current = rooms.get(room);

    if (!current) {
      current = { players: 0, started: false, scores: {} };
    }

    if (current.players >= 1) {
      return NextResponse.json(
        { ok: false, reason: "Room is full" },
        { status: 200 }
      );
    }

    current.players += 1;
    rooms.set(room, current);

    await pusherServer.trigger(`room-${room}`, "players-update", {
      players: current.players,
    });

    return NextResponse.json({ ok: true, players: current.players });
  } catch (err) {
    console.error("JOIN ROUTE ERROR:", err);
    return NextResponse.json(
      { ok: false, reason: "Server error" },
      { status: 500 }
    );
  }
}
