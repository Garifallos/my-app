import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const { room, player, score } = await req.json();

    if (!room || !player || score === undefined) {
      return Response.json(
        { ok: false, error: "Missing data" },
        { status: 400 }
      );
    }

    // Φέρνουμε το δωμάτιο
    let roomData = rooms.get(room);

    if (!roomData) {
      roomData = { scores: { host: null, guest: null } };
    }

    if (!roomData.scores) {
      roomData.scores = { host: null, guest: null };
    }

    // Αποθηκεύουμε score
    if (player === "host") roomData.scores.host = score;
    if (player === "guest") roomData.scores.guest = score;

    rooms.set(room, roomData);

    const { host, guest } = roomData.scores;

    // Αν δεν έχουν τελειώσει και οι 2 → περιμένουμε
    if (host === null || guest === null) {
      return Response.json({
        ok: true,
        finished: false,
        scores: roomData.scores,
      });
    }

    // Αν ΤΕΛΕΙΩΣΑΝ και οι 2 → βρίσκουμε τον winner
    let winner: "host" | "guest" | "draw" = "draw";
    if (host > guest) winner = "host";
    else if (guest > host) winner = "guest";

    // Στείλε Pusher event στον guest & host
    await pusherServer.trigger(`room-${room}`, "score-final", {
      scores: { host, guest },
      winner,
    });

    return Response.json({
      ok: true,
      finished: true,
      scores: { host, guest },
      winner,
    });
  } catch (err) {
    console.error(err);
    return Response.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
