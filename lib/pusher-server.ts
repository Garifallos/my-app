

import Pusher from "pusher";

console.log("🔥 PUSHER ENV CHECK:", {
  APP_ID: process.env.PUSHER_APP_ID,
  KEY: process.env.PUSHER_KEY,
  SECRET: process.env.PUSHER_SECRET,
  SECRET_LENGTH: process.env.PUSHER_SECRET?.length,
  CLUSTER: process.env.PUSHER_CLUSTER,
});

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});
