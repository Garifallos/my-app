import { NextRequest } from "next/server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code) return Response.json({ ok: false });

  const data = rooms.get(code);
  if (!data) return Response.json({ ok: true });

  data.players = Math.max(0, data.players - 1);
  rooms.set(code, data);

  await pusherServer.trigger(`room-${code}`, "players-update", {
    players: data.players,
  });

  return Response.json({ ok: true });
}
