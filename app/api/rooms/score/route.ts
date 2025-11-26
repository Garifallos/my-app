import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { room, player, score } = await req.json();

  if (!room || !player) {
    return Response.json(
      { ok: false, error: "Missing room or player" },
      { status: 400 }
    );
  }

  // ensure room exists
  let data = rooms.get(room);
  if (!data) {
    data = { scores: {} };
  }
  if (!data.scores) data.scores = {};

  // save score
  data.scores[player] = score;
  rooms.set(room, data);

  const hostScore = data.scores.host;
  const guestScore = data.scores.guest;

  // if not both players finished → WAIT
  if (hostScore === undefined || guestScore === undefined) {
    return Response.json({ ok: true, finished: false });
  }

  // calculate winner
  let result: "host" | "guest" | "draw" = "draw";
  if (hostScore > guestScore) result = "host";
  else if (guestScore > hostScore) result = "guest";

  const scores = { host: hostScore, guest: guestScore };

  // notify both players
  try {
    await pusherServer.trigger(room, "score-final", {
      winner: result,
      scores,
    });
  } catch (err) {
    console.error("Failed to send pusher score", err);
  }

  return Response.json({
    ok: true,
    finished: true,
    result,
    scores,
  });
}
