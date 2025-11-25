import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { rooms } from "@/lib/rooms";
import { pusherServer } from "@/lib/pusher-server";
import { deleteRoom } from "@/app/api/rooms/store";


export async function POST(req: NextRequest) {
  const { room } = await req.json();

  if (!room) {
    return new Response("Missing room", { status: 400 });
  }

  await pusherServer.trigger(`room-${room}`, "end-game", {});

  rooms.delete(room);


  return Response.json({ ok: true });
}


export async function POST(req: Request) {
  const { room } = await req.json();

  // notify clients
  await pusherServer.trigger(`room-${room}`, "end-game", {});

  // delete room from memory
  deleteRoom(room);

  return new Response(JSON.stringify({ ok: true }));
}

