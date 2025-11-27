"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";

// TYPES
type JoinResponse =
  | { ok: true; players: number }
  | { ok: false; reason?: string };

type PlayersUpdateEvent = {
  players: number;
};

type StartGameEvent = {
  url: string;
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const code = params.code as string;
  const isHost = searchParams.get("host") === "1";

  const [guests, setGuests] = useState(0);
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------
  // GUEST: JOIN ROOM
  // ---------------------------------
  useEffect(() => {
    let cancelled = false;

    async function joinGuest() {
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

        const data: JoinResponse = await res.json();

        if (!cancelled) {
          if (!data.ok) {
            setError(data.reason || "Failed to join room");
          } else {
            setGuests(data.players);
          }
        }
      } catch {
        if (!cancelled) setError("Join error");
      } finally {
        if (!cancelled) setJoining(false);
      }
    }

    joinGuest();

    return () => {
      cancelled = true;
    };
  }, [code, isHost]);

  // ---------------------------------
  // PUSHER: LISTEN FOR EVENTS
  // ---------------------------------
  useEffect(() => {
    const channelName = `room-${code}`;
    const channel = pusherClient.subscribe(channelName);

    function onPlayersUpdate(data: PlayersUpdateEvent) {
      setGuests(data.players);
    }

    function onStartGame(data: StartGameEvent) {
      if (data.url) router.replace(data.url);
    }

    channel.bind("players-update", onPlayersUpdate);
    channel.bind("start-game", onStartGame);

    return () => {
      channel.unbind("players-update", onPlayersUpdate);
      channel.unbind("start-game", onStartGame);
      pusherClient.unsubscribe(channelName);
    };
  }, [code, router]);

  // ---------------------------------
  // HOST: START GAME
  // ---------------------------------
  async function startGame() {
    if (!isHost || guests < 1) return;

    const category = 9; // static category
    const difficulty = "";

    const hostUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=1&difficulty=${difficulty}`;
    const guestUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=0&difficulty=${difficulty}`;

    // Notify guest via start-game event
    await fetch("/api/rooms/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: code, url: guestUrl }),
    });

    router.replace(hostUrl);
  }

  const totalPlayers = 1 + guests;

  // ---------------------------------
  // UI
  // ---------------------------------
  if (joining) {
    return (
      <div className="quiz-container">
        <h1>Room {code}</h1>
        <p>Joining…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-container">
        <h1>Room {code}</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h1>Room code: {code}</h1>

      <p>Players: {totalPlayers}/2</p>

      <ul style={{ marginTop: 16 }}>
        <li>Player 1 (Host) {isHost && "← You"}</li>

        {guests >= 1 && (
          <li>Player 2 (Guest) {!isHost && "← You"}</li>
        )}
      </ul>

      {isHost && guests < 1 && (
        <p style={{ marginTop: 16, opacity: 0.7 }}>Waiting for guest…</p>
      )}

      {isHost && guests >= 1 && (
        <button
          className="next-btn"
          style={{ marginTop: 24 }}
          onClick={startGame}
        >
          Start Game
        </button>
      )}

      {!isHost && (
        <p style={{ marginTop: 16, opacity: 0.7 }}>
          Waiting for host to start the game…
        </p>
      )}
    </div>
  );
}
