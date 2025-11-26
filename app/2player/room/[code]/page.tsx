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

  const [guests, setGuests] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  // -----------------------------
  // JOIN (ONLY GUEST)
  // -----------------------------
  useEffect(() => {
    let active = true;

    async function join() {
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
          if (active) setError(data.reason || "Join failed");
        } else {
          if (active) setGuests(data.players);
        }
      } catch {
        if (active) setError("Join error");
      } finally {
        if (active) setJoining(false);
      }
    }

    join();
    return () => {
      active = false;
    };
  }, [code, isHost]);

  // -----------------------------
  // PUSHER EVENTS
  // -----------------------------
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

  // -----------------------------
  // START GAME (HOST ONLY)
  // -----------------------------
 async function startGame() {
  const category = 9;
  const difficulty = "";

  const hostUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=1&difficulty=${difficulty}`;
  const guestUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=0&difficulty=${difficulty}`;

  // 1️⃣ πες στο Next.js να ετοιμάσει ΤΩΡΑ τη σελίδα hostUrl
  router.prefetch(hostUrl);

  // 2️⃣ send event to guest
  await fetch("/api/rooms/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room: code, url: guestUrl }),
  });

  // 3️⃣ μικρή καθυστέρηση για να «σταθεροποιηθεί» το URL
  await new Promise((resolve) => setTimeout(resolve, 120));

  // 4️⃣ τώρα push (ή replace)
  router.replace(hostUrl);
}

  const totalPlayers = 1 + guests;

  // -----------------------------
  // UI
  // -----------------------------
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
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h1>Room code: {code}</h1>

      <p>Players: {totalPlayers}/2</p>

      <ul style={{ marginTop: 20 }}>
        <li>Player 1 (Host){isHost && " ← You"}</li>
        {guests >= 1 && <li>Player 2 (Guest){!isHost && " ← You"}</li>}
      </ul>

      {isHost && totalPlayers < 2 && (
        <p style={{ marginTop: 20, opacity: 0.7 }}>
          Waiting for guest...
        </p>
      )}

      {isHost && totalPlayers === 2 && (
        <button className="next-btn" style={{ marginTop: 20 }} onClick={startGame}>
          Start Game
        </button>
      )}

      {!isHost && (
        <p style={{ marginTop: 20, opacity: 0.7 }}>
          Waiting for host to start...
        </p>
      )}
    </div>
  );
}
