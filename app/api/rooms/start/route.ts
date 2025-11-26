import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { room, url } = await req.json();

  if (!room || !url) {
    return Response.json(
      { ok: false, reason: "Missing room or url" },
      { status: 400 }
    );
  }

  await pusherServer.trigger(`room-${room}`, "start-game", {
    url,
  });

  return Response.json({ ok: true });
}
