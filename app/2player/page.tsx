"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TwoPlayerHome() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  function createRoom() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    router.push(`/2player/room/${code}?host=1`);
  }

  function joinRoom() {
    if (joinCode.length === 4) {
      router.push(`/2player/room/${joinCode}`);
    }
  }

  return (
    <div className="quiz-container">
      <h1>2 Player Mode</h1>

      <button className="next-btn" onClick={createRoom}>
        Create Room
      </button>

      <h2 style={{ marginTop: 30 }}>Join existing room</h2>

      <input
        className="select-glass"
        placeholder="Enter 4-digit room code..."
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value)}
        maxLength={4}
      />

      <button
        className="next-btn"
        disabled={joinCode.length < 4}
        onClick={joinRoom}
        style={{ marginTop: 10 }}
      >
        Join Room
      </button>
    </div>
  );
}
