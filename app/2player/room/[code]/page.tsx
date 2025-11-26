"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";

type PlayersUpdatePayload = {
  players: number;
};

type StartGamePayload = {
  url: string;
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const code = params.code as string;
  const isHost = searchParams.get("host") === "1";

  // guests = πόσοι guests (όχι ο host)
  const [guests, setGuests] = useState(0);
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------
  // JOIN: ΜΟΝΟ Ο GUEST ΚΑΝΕΙ /api/rooms/join
  // ---------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function joinAsGuest() {
      if (isHost) {
        // ο host δεν καλεί /join, θεωρείται ήδη μέσα
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

        if (!res.ok || !data.ok) {
          if (!cancelled) {
            setError(data.reason || "Failed to join room");
          }
          return;
        }

        if (!cancelled) {
          // data.players = πόσοι guests
          setGuests(data.players ?? 1);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Network error while joining room");
        }
      } finally {
        if (!cancelled) {
          setJoining(false);
        }
      }
    }

    joinAsGuest();

    return () => {
      cancelled = true;
    };
  }, [code, isHost]);

  // ---------------------------------------------------
  // PUSHER: players-update & start-game
  // ---------------------------------------------------
  useEffect(() => {
    const channelName = `room-${code}`;
    const channel = pusherClient.subscribe(channelName);

    const handlePlayersUpdate = (data: PlayersUpdatePayload) => {
      setGuests(data.players ?? 0);
    };

    const handleStartGame = (data: StartGamePayload) => {
      if (data?.url) {
        router.replace(data.url);
      }
    };

    channel.bind("players-update", handlePlayersUpdate);
    channel.bind("start-game", handleStartGame);

    return () => {
      channel.unbind("players-update", handlePlayersUpdate);
      channel.unbind("start-game", handleStartGame);
      pusherClient.unsubscribe(channelName);
    };
  }, [code, router]);

  // ---------------------------------------------------
  // START GAME (HOST ONLY)
  // ---------------------------------------------------
  async function startGame() {
    if (!isHost) return;
    if (guests < 1) return; // πρέπει να υπάρχει guest

    const category = 9; // General Knowledge
    const difficulty = ""; // μπορείς αργότερα να το κάνεις param

    const hostUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=1&difficulty=${difficulty}`;
    const guestUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=0&difficulty=${difficulty}`;

    try {
      // ενημερώνουμε τον guest μέσω Pusher
      await fetch("/api/rooms/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: code, url: guestUrl }),
      });
    } catch (err) {
      console.error("Failed to start game", err);
    }

    // και μετά πάει ο host στο quiz
    router.replace(hostUrl);
  }

  const totalPlayers = 1 + guests; // 1 host + guests

  // ---------------------------------------------------
  // UI STATES
  // ---------------------------------------------------
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

  // ---------------------------------------------------
  // MAIN ROOM UI
  // ---------------------------------------------------
  return (
    <div className="quiz-container">
      <h1>Room code: {code}</h1>

      <p>Players: {totalPlayers}/2</p>

      <ul style={{ marginTop: 16 }}>
        <li>
          Player 1 (Host)
          {isHost && " ← You"}
        </li>
        {guests >= 1 && (
          <li>
            Player 2 (Guest)
            {!isHost && " ← You"}
          </li>
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
