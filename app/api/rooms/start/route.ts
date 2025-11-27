// app/api/rooms/start/route.ts
import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const { room, url } = await req.json();

    console.log("🔥 /api/rooms/start CALLED", { room, url });

    if (!room || !url) {
      console.log("❌ Missing room or url");
      return Response.json(
        { ok: false, reason: "Missing room or url" },
        { status: 400 }
      );
    }

    // Send event to guest
    await pusherServer.trigger(`room-${room}`, "start-game", { url });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("SERVER ERROR in /start:", err);
    return Response.json({ ok: false, error: "Server error" });
  }
}
