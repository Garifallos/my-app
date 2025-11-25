"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

function FeedbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Single-player data
  const category = searchParams.get("category") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const score = searchParams.get("score") ?? "";
  const total = searchParams.get("total") ?? "";

  // Multiplayer data
  const winner = searchParams.get("winner");
  const hostScore = searchParams.get("hostScore");
  const guestScore = searchParams.get("guestScore");

  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert("Thank you for your feedback!");
    router.push("/");
  }

  const finalRating = hoverRating || rating;

  return (
    <div className="quiz-container">
      <h1>Quiz Feedback</h1>

      {winner && (
        <div
          style={{
            marginTop: 20,
            marginBottom: 20,
            padding: 18,
            borderRadius: 12,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 600,
            background:
              winner === "draw"
                ? "rgba(255,255,255,0.2)"
                : winner === "host"
                ? "rgba(0,200,0,0.25)"
                : "rgba(0,120,255,0.25)",
            border:
              winner === "draw"
                ? "1px solid rgba(255,255,255,0.3)"
                : winner === "host"
                ? "1px solid rgba(0,200,0,0.4)"
                : "1px solid rgba(0,120,255,0.4)",
            backdropFilter: "blur(4px)",
          }}
        >
          {winner === "draw" && "🤝 The match ended in a Draw!"}
          {winner === "host" && `🏆 Winner: Host (${hostScore} - ${guestScore})`}
          {winner === "guest" &&
            `🏆 Winner: Guest (${guestScore} - ${hostScore})`}
        </div>
      )}

      {winner && (
        <button
          className="next-btn"
          style={{ marginTop: 5, marginBottom: 20 }}
          onClick={() =>
            alert(
              winner === "draw"
                ? "No winner — it's a draw!"
                : winner === "host"
                ? "Host won the match!"
                : "Guest won the match!"
            )
          }
        >
          Show Winner
        </button>
      )}

      <p style={{ opacity: 0.8, marginBottom: 10 }}>
        Category: <strong>{category || "N/A"}</strong>
      </p>

      {difficulty && (
        <p style={{ opacity: 0.8, marginBottom: 10 }}>
          Difficulty: <strong>{difficulty}</strong>
        </p>
      )}

      {score && total && (
        <p style={{ opacity: 0.8, marginBottom: 20 }}>
          Your score: <strong>{score}</strong> / {total}
        </p>
      )}

      <div style={{ marginBottom: 25 }}>
        <p style={{ marginBottom: 8 }}>Rate this quiz:</p>

        <div style={{ display: "flex", gap: 8, fontSize: 30 }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= finalRating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transform: active ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.12s",
                }}
              >
                <span style={{ color: active ? "#ffd700" : "#777" }}>★</span>
              </button>
            );
          })}
        </div>

        {rating > 0 && (
          <p style={{ opacity: 0.7, marginTop: 8 }}>
            You rated this quiz: <strong>{rating}</strong> / 5
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <textarea
          className="select-glass"
          style={{
            width: "100%",
            minHeight: 150,
            resize: "vertical",
            padding: 12,
            marginBottom: 20,
            fontSize: 16,
          }}
          placeholder="What did you think about this quiz? Any suggestions?"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <button type="submit" className="next-btn">
          Submit Feedback & Go Home
        </button>
      </form>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="quiz-container"><h1>Loading…</h1></div>}>
      <FeedbackContent />
    </Suspense>
  );
}
