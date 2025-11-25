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

    // Ensure scores object exists
    room.scores = room.scores || {};

    // Save score
    if (player === "host" || player === "guest") {
      room.scores[player] = score;
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid player type" },
        { status: 400 }
      );
    }

    rooms.set(code, room);

    // If both have played → calculate winner
    const hostScore = room.scores.host;
    const guestScore = room.scores.guest;

    if (hostScore !== undefined && guestScore !== undefined) {
      let result: "host" | "guest" | "draw";

      if (hostScore > guestScore) result = "host";
      else if (guestScore > hostScore) result = "guest";
      else result = "draw";

      return NextResponse.json(
        {
          ok: true,
          finished: true,
          result,
          scores: {
            host: hostScore,
            guest: guestScore,
          },
        },
        { status: 200 }
      );
    }

    // Only one player finished → wait
    return NextResponse.json(
      {
        ok: true,
        finished: false,
        scores: room.scores,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("SCORE ROUTE ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
