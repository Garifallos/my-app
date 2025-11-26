import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

type PlayerType = "host" | "guest";

export async function POST(req: NextRequest) {
  const { room, player, score } = await req.json();

  if (!room || !player) {
    return Response.json(
      { ok: false, error: "Missing room or player" },
      { status: 400 }
    );
  }

  const playerType = player as PlayerType;

  let data = rooms.get(room);
  if (!data) data = { scores: {} };
  if (!data.scores) data.scores = {};

  // store score
  data.scores[playerType] = score;
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

  // CRITICAL PART ⬇⬇⬇⬇⬇
  await pusherServer.trigger(`room-${room}`, "score-final", {
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
