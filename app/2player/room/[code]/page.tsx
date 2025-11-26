"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const code = params.code as string;
  const isHost = searchParams.get("host") === "1";

  const [players, setPlayers] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // GUEST JOIN
  useEffect(() => {
    if (isHost) return;

    async function joinRoom() {
      try {
        const res = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();
        if (!data.ok) {
          setError(data.reason);
        } else {
          setPlayers(data.players + 1); // host + guest
        }
      } catch {
        setError("Join error");
      }
    }

    joinRoom();
  }, [code, isHost]);

  // PUSHER LISTENERS
  useEffect(() => {
    const channel = pusherClient.subscribe(`room-${code}`);

    channel.bind("players-update", (data: any) => {
      setPlayers(1 + data.players);
    });

    channel.bind("start-game", (data: any) => {
      router.push(data.url);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`room-${code}`);
    };
  }, [code, router]);

  async function startGame() {
    const url = `/quiz/9?multiplayer=1&room=${code}&host=1`;

    await fetch("/api/rooms/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: code, url }),
    });

    router.push(url);
  }

  return (
    <div className="quiz-container">
      <h1>Room code: {code}</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p>Players in room: {players}/2</p>

      {isHost && players === 2 && (
        <button className="next-btn" onClick={startGame}>
          Start Game
        </button>
      )}

      {!isHost && <p>Waiting for host...</p>}
    </div>
  );
}
