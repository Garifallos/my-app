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

  // πόσοι guests έχουν μπει (0 ή 1)
  const [guestsCount, setGuestsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  // -------------------------------
  // JOIN ROOM (ΜΟΝΟ GUEST)
  // -------------------------------
  useEffect(() => {
    let active = true;

    async function joinAsGuest() {
      if (isHost) {
        setJoining(false);
        return;
      }

      const storageKey = `joined-${code}-guest`;

      // αν ο guest έχει ξαναμπεί (refresh)
      if (typeof window !== "undefined") {
        const already = sessionStorage.getItem(storageKey);
        if (already) {
          setJoining(false);
          return;
        }
      }

      try {
        const res = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: code }),
        });

        const data = await res.json();

        if (!data.ok) {
          if (active) setError(data.reason || "Failed to join room");
          return;
        }

        if (active) {
          setGuestsCount(data.players);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(storageKey, "1");
          }
        }
      } catch (err) {
        if (active) setError("Network error while joining room");
      } finally {
        if (active) setJoining(false);
      }
    }

    joinAsGuest();

    return () => {
      active = false;
    };
  }, [code, isHost]);

  // -------------------------------
  // PUSHER SUBSCRIBE
  // -------------------------------
  useEffect(() => {
    if (!code) return;

    const channelName = `room-${code}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("players-update", (data: any) => {
      setGuestsCount(data.players);
    });

    channel.bind("start-game", (data: any) => {
      if (data?.url) {
        router.push(data.url);
      }
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [code, router]);

  // -------------------------------
  // LEAVE ROOM ON TAB CLOSE
  // -------------------------------
  useEffect(() => {
    function handleBeforeUnload() {
      fetch("/api/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: code }),
        keepalive: true,
      });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [code]);

  // -------------------------------
  // START GAME (HOST ONLY)
  // -------------------------------
  async function startGame() {
    const category = "9";

    // ΣΩΣΤΑ URLs
    const hostUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=1`;
    const guestUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=0`;

    // Στέλνουμε στους guests ΤΟ ΣΩΣΤΟ URL
    await fetch("/api/rooms/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: code,
        url: guestUrl,
      }),
    });

    // Ο host μπαίνει στο δικό του URL
    router.push(hostUrl);
  }

  // -------------------------------
  // UI
  // -------------------------------
  const totalPlayers = 1 + guestsCount;

  if (joining) {
    return (
      <div className="quiz-container">
        <h1>Room {code}</h1>
        <p>Joining room...</p>
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
        {guestsCount >= 1 && <li>Player 2 {!isHost && "(You)"} </li>}
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
          Waiting for host to start the game...
        </p>
      )}
    </div>
  );
}
