import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();   // ⬅️ ΠΙΣΩ ΣΕ CODE

  if (!code) {
    return Response.json(
      { ok: false, reason: "Missing room code" },
      { status: 400 }
    );
  }

  let data = rooms.get(code);
  if (!data) {
    data = { players: 0 };
  }

  if (data.players >= 1) {
    return Response.json(
      { ok: false, reason: "Room is full", players: data.players },
      { status: 400 }
    );
  }

  data.players += 1;
  rooms.set(code, data);

  await pusherServer.trigger(`room-${code}`, "players-update", {
    players: data.players,
  });

  return Response.json({ ok: true, players: data.players });
}
