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

  // guestsCount = πόσοι GUESTS υπάρχουν στο room (0 ή 1)
  const [guestsCount, setGuestsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  // -------------------------------
  // JOIN ROOM (ΜΟΝΟ GUEST) 
  // -------------------------------
  useEffect(() => {
    let active = true;

    async function joinAsGuest() {
      // Ο host δεν κάνει ποτέ join στο API
      if (isHost) {
        setJoining(false);
        return;
      }

      const storageKey = `joined-${code}-guest`;

      // Αν ο guest έχει ήδη κάνει join σε αυτό το room (refresh / dev)
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
          body: JSON.stringify({ room: code }), // ✅ ΣΩΣΤΟ: room
        });

        const data = await res.json();

        if (!data.ok) {
          if (active) setError(data.reason || "Failed to join room");
          return;
        }

        if (active) {
          // data.players = πόσοι guests υπάρχουν (0 ή 1)
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
  // PUSHER SUBSCRIBE (HOST + GUEST)
  // -------------------------------
  useEffect(() => {
    if (!code) return;

    let active = true;

    const channelName = `room-${code}`;
    const channel = pusherClient.subscribe(channelName);
    // console.log("Subscribed to:", channelName);

    channel.bind("players-update", (data: any) => {
      if (!active) return;
      // data.players = guests στον server
      setGuestsCount(data.players);
    });

    channel.bind("start-game", (data: any) => {
      if (!active) return;
      if (data?.url) {
        router.push(data.url);
      }
    });

    return () => {
      active = false;
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [code, router]);

  // -------------------------------
  // LEAVE ROOM ON TAB CLOSE
  // -------------------------------
  useEffect(() => {
    function handleBeforeUnload() {
      // keepalive ώστε να προλάβει να σταλεί
      fetch("/api/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: code }), // ✅ room
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

  // Host και Guest πρέπει να έχουν διαφορετικό host param
  const hostUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=1`;
  const guestUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=0`;

  // Ειδοποιούμε τους guests να πάνε στο guestUrl
  await fetch("/api/rooms/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room: code,
      url: guestUrl, // ⬅️ ΠΟΛΥ ΣΗΜΑΝΤΙΚΟ
    }),
  });

  // Ο HOST πάει στο δικό του URL
  router.push(hostUrl);
}


  // LOADING
  if (joining) {
    return (
      <div className="quiz-container">
        <h1>Room {code}</h1>
        <p>Joining room...</p>
      </div>
    );
  }

  // ERROR
  if (error) {
    return (
      <div className="quiz-container">
        <h1>Room {code}</h1>
        <p style={{ color: "tomato" }}>{error}</p>
      </div>
    );
  }

  // συνολικοί παίκτες = 1 host + guestsCount
  const totalPlayers = 1 + guestsCount;

  // UI
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
