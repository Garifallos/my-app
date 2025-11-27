// app/api/rooms/start/route.ts
import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 /api/rooms/start CALLED"); // DEBUG 1

    const body = await req.json();
    console.log("📥 Body:", body); // DEBUG 2

    const { room, category, difficulty } = body;

    if (!room || !category) {
      console.log("❌ Missing room or category"); // DEBUG 3
      return Response.json({ ok: false, error: "Missing data" });
    }

    const apiURL = `${process.env.NEXT_PUBLIC_URL}/api/questions`;
    console.log("🌍 Fetching:", apiURL); // DEBUG 4

    const res = await fetch(apiURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ category, difficulty }),
    });

    console.log("📡 Response status:", res.status); // DEBUG 5

    const data = await res.json();
    console.log("📡 Response JSON:", data); // DEBUG 6

    if (!data.ok || !Array.isArray(data.data)) {
      console.log("❌ Invalid questions:", data); // DEBUG 7
      return Response.json({ ok: false, error: "Failed to load questions" });
    }

    console.log("🎉 Questions OK, sending Pusher event"); // DEBUG 8

    await pusherServer.trigger(`room-${room}`, "questions-ready", {
      questions: data.data,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("💥 SERVER ERROR:", err); // DEBUG 9
    return Response.json({ ok: false, error: "Server error" });
  }
}
