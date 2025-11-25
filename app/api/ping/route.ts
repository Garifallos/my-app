import { pusherServer } from "@/lib/pusher-server";

export async function GET() {
  await pusherServer.trigger("test-channel", "ping", { msg: "hello" });

  return Response.json({ ok: true });
}
