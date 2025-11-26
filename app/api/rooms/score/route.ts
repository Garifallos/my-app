import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";

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

  // ensure room exists
  let data = rooms.get(room);
  if (!data) {
    data = { scores: { host: undefined, guest: undefined } };
  }
  if (!data.scores) {
    data.scores = { host: undefined, guest: undefined };
  }

  // TS-safe score assignment
  data.scores[playerType] = score;
  rooms.set(room, data);

  const hostScore = data.scores.host;
  const guestScore = data.scores.guest;

  // if not both scores submitted → wait
  if (hostScore === undefined || guestScore === undefined) {
    return Response.json({ ok: true, finished: false });
  }

  // calculate winner
  let result: "host" | "guest" | "draw" = "draw";
  if (hostScore > guestScore) result = "host";
  else if (guestScore > hostScore) result = "guest";

  const scores = { host: hostScore, guest: guestScore };

  return Response.json({
    ok: true,
    finished: true,
    result,
    scores,
  });
}
