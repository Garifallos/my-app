// app/api/rooms/start/route.ts
import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  try {
    const { room, category, difficulty } = await req.json();

    console.log("🔥 /api/rooms/start called", { room, category, difficulty });

    if (!room || !category) {
      console.log("❌ Missing params");
      return Response.json({ ok: false, error: "Missing data" });
    }

    const apiURL = `${process.env.NEXT_PUBLIC_URL}/api/questions`;
    console.log("🌍 Fetching:", apiURL);

    const res = await fetch(apiURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ category, difficulty }),
    });

    console.log("📡 questions status", res.status);

    const data = await res.json();
    console.log("📦 questions payload", data);

    if (!data.ok || !Array.isArray(data.data)) {
      console.log("❌ Failed to load questions");
      return Response.json({ ok: false, error: "Failed to load questions" });
    }

    const questions = data.data;

    // 🔥 Send event to BOTH Host & Guest
    await pusherServer.trigger(`room-${room}`, "questions-ready", {
      questions,
    });

    console.log("✅ Sent questions-ready event to", `room-${room}`);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("💥 SERVER ERROR:", err);
    return Response.json({ ok: false, error: "Server error" });
  }
}
