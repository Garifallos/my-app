import { NextRequest, NextResponse } from "next/server";
import { rooms } from "../store";

export async function POST(req: NextRequest) {
  try {
    const { room: code, player, score } = await req.json();

    if (!code || !player || typeof score !== "number") {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const room = rooms.get(code);
    if (!room) {
      return NextResponse.json(
        { ok: false, error: "Room not found" },
        { status: 404 }
      );
    }

    room.scores = room.scores || {};

    // Strict check
    if (player !== "host" && player !== "guest") {
      return NextResponse.json(
        { ok: false, error: "Invalid player type" },
        { status: 400 }
      );
    }

    // 🔥 Type-correct assignment
    room.scores[player as "host" | "guest"] = score;

    rooms.set(code, room);

    return NextResponse.json({ ok: true, scores: room.scores });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
