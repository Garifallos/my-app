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

  let data = rooms.get(room);
  if (!data) data = { scores: {} };
  if (!data.scores) data.scores = {};

  data.scores[player] = score;
  rooms.set(room, data);

  const hostScore = data.scores.host;
  const guestScore = data.scores.guest;

  if (hostScore === undefined || guestScore === undefined) {
    return Response.json({ ok: true, finished: false });
  }

  let result: "host" | "guest" | "draw" = "draw";
  if (hostScore > guestScore) result = "host";
  else if (guestScore > hostScore) result = "guest";

  const scores = { host: hostScore, guest: guestScore };

  // ❗ τότε ήταν έτσι — προσέξτε, ΔΕΝ είχε prefix
  await pusherServer.trigger(room, "score-final", {
    winner: result,
    scores,
  });

  return Response.json({
    ok: true,
    finished: true,
    result,
    scores,
  });
}
