"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinRoomPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function joinRoom() {
    if (code.length === 4) {
      router.push(`/2player/room/${code}`);
    }
  }

  return (
    <div className="quiz-container">
      <h1>Join Room</h1>

      <p style={{ opacity: 0.7, marginBottom: 10 }}>
        Enter the 4-digit room code your friend gave you:
      </p>

      <input
        className="select-glass"
        placeholder="Room code..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={4}
      />

      <button
        className="next-btn"
        style={{ marginTop: 20 }}
        disabled={code.length < 4}
        onClick={joinRoom}
      >
        Join
      </button>
    </div>
  );
}

