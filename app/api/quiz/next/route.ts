import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { room, step } = await req.json();

  if (!room || typeof step !== "number") {
    return new Response("Missing room or step", { status: 400 });
  }

  await pusherServer.trigger(`room-${room}`, "next-question", {
    step,
  });

  return Response.json({ ok: true });
}
