"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FeedbackPage() {
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  function submitFeedback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    console.log("Rating:", rating);
    console.log("Feedback:", text);

    router.push("/?reset=1");
  }

  return (
    <div className="quiz-container">
      <h1>Project Feedback</h1>

      <form onSubmit={submitFeedback}>
        <label>Rate the Quiz</label>

        <div className="stars">
          {[1, 2, 3, 4, 5].map((num) => (
            <span
              key={num}
              className={`star ${rating >= num ? "active" : ""}`}
              onClick={() => setRating(num)}
            >
              ⭐
            </span>
          ))}
        </div>

        <textarea
          className="feedback-text"
          placeholder="Leave your feedback..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>

        <button className="next-btn" type="submit">
          Αποστολή
        </button>
      </form>
    </div>
  );
}
