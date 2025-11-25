import { NextRequest, NextResponse } from "next/server";
import { rooms, RoomData } from "../store";

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

    // Save score
    room.scores = room.scores || {};
    room.scores[player] = score;

    rooms.set(code, room);

    const hostScore = room.scores.host;
    const guestScore = room.scores.guest;

    // If both players have submitted a score
    if (hostScore !== undefined && guestScore !== undefined) {
      let result = "draw";

      if (hostScore > guestScore) result = "host";
      else if (guestScore > hostScore) result = "guest";

      return NextResponse.json({
        ok: true,
        finished: true,
        result,
        scores: room.scores,
      });
    }

    // Still waiting for the other player
    return NextResponse.json({
      ok: true,
      finished: false,
      scores: room.scores,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
