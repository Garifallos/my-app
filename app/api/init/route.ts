import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { room, questions } = await req.json();

  if (!room || !questions) {
    return new Response("Missing room or questions", { status: 400 });
  }

  await pusherServer.trigger(`room-${room}`, "questions-loaded", {
    questions,
  });

  return Response.json({ ok: true });
}
