// app/api/rooms/start/route.ts
import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const { room, category, difficulty } = await req.json();

    if (!room || !category) {
      return Response.json({ ok: false, error: "Missing data" });
    }

    // Fetch questions from your questions API
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ category, difficulty }),
    });

    const data = await res.json();

    if (!data.ok || !Array.isArray(data.data)) {
      return Response.json({ ok: false, error: "Failed to load questions" });
    }

    const questions = data.data;

    // 🔥 Send questions to the room via Pusher
    await pusherServer.trigger(`room-${room}`, "questions-ready", {
      questions,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: "Server error" });
  }
}
