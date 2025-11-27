// app/api/rooms/start/route.ts
import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const { room, url } = await req.json();

    if (!room || !url) {
      return Response.json(
        { ok: false, reason: "Missing room or url" },
        { status: 400 }
      );
    }

    // Send start-game event to GUEST
    await pusherServer.trigger(`room-${room}`, "start-game", { url });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("SERVER ERROR in /api/rooms/start:", err);
    return Response.json({ ok: false, error: "Server error" });
  }
}
