// app/2player/room/[code]/page.tsx
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

  const [guests, setGuests] = useState(0); // πόσοι guests
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  // -------------------------------
  // GUEST JOIN
  // -------------------------------
  useEffect(() => {
    let active = true;

    async function joinRoom() {
      if (isHost) {
        setJoining(false);
        return;
      }

      try {
        const res = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (!data.ok) {
          if (active) setError(data.reason || "Join error");
        } else {
          if (active) setGuests(data.players);
        }
      } catch (e) {
        if (active) setError("Network error");
      } finally {
        if (active) setJoining(false);
      }
    }

    joinRoom();

    return () => {
      active = false;
    };
  }, [code, isHost]);

  // -------------------------------
  // PUSHER SUBSCRIBE
  // -------------------------------
  useEffect(() => {
    const channel = pusherClient.subscribe(`room-${code}`);

    channel.bind("players-update", (data: any) => {
      setGuests(data.players);
    });

    channel.bind("start-game", (data: any) => {
      if (data?.url) router.push(data.url);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`room-${code}`);
    };
  }, [code, router]);

  // -------------------------------
  // LEAVE ON CLOSE (optional)
  // -------------------------------
  useEffect(() => {
    function handleUnload() {
      fetch("/api/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        keepalive: true,
      });
    }

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [code]);

  // -------------------------------
  // START GAME (HOST)
  // -------------------------------
  async function startGame() {
    const category = "9";

    const hostUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=1`;
    const guestUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=0`;

    await fetch("/api/rooms/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: code,
        url: guestUrl,
      }),
    });

    router.push(hostUrl);
  }

  const totalPlayers = 1 + guests; // 1 host + guests

  if (joining) {
    return (
      <div className="quiz-container">
        <h1>Room {code}</h1>
        <p>Joining...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-container">
        <h1>Room {code}</h1>
        <p style={{ color: "tomato" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h1>Room code: {code}</h1>

      <p>Players in room: {totalPlayers} / 2</p>

      <ul style={{ marginTop: 20 }}>
        <li>Player 1 {isHost && "(You, host)"}</li>
        {guests >= 1 && <li>Player 2 {!isHost && "(You)"} </li>}
      </ul>

      {isHost && totalPlayers < 2 && (
        <p style={{ marginTop: 30, opacity: 0.7 }}>
          Waiting for second player...
        </p>
      )}

      {isHost && totalPlayers === 2 && (
        <button
          className="next-btn"
          style={{ marginTop: 30 }}
          onClick={startGame}
        >
          Start Game
        </button>
      )}

      {!isHost && (
        <p style={{ marginTop: 30, opacity: 0.7 }}>
          Waiting for host to start...
        </p>
      )}
    </div>
  );
}
