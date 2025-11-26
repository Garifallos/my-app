// app/api/rooms/start/route.ts
import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const room = body.room;
    const url = body.url;

    if (!room || !url) {
      return Response.json(
        { ok: false, reason: "Missing room or url" },
        { status: 400 }
      );
    }

    // send URL only to this room
    await pusherServer.trigger(`room-${room}`, "start-game", {
      url,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("START ROUTE ERROR", err);
    return Response.json(
      { ok: false, reason: "Server error in start route" },
      { status: 500 }
    );
  }
}
