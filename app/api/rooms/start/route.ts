// app/api/rooms/start/route.ts
import { NextRequest } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const room = body?.room ?? body?.code ?? null;
  const url = body?.url ?? null;

  // Αν για κάποιο λόγο λείπει room ή url, μην σπάσεις τον client,
  // απλά γύρνα ok:false με reason.
  if (!room || !url) {
    return Response.json(
      { ok: false, reason: "Missing room or url" },
      { status: 200 }
    );
  }

  // Στέλνουμε το start-game event στο κανάλι του room.
  await pusherServer.trigger(`room-${room}`, "start-game", { url });

  return Response.json({ ok: true }, { status: 200 });
}
