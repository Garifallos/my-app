"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";

type Question = {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
};

type AnswerOption = {
  text: string;
  isCorrect: boolean;
};

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // URL params
  const category = Number(params.category);
  const difficulty = searchParams.get("difficulty") || "";
  const multiplayer = searchParams.get("multiplayer") === "1";
  const room = searchParams.get("room");
  const isHost = searchParams.get("host") === "1";

  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const [finished, setFinished] = useState(false);

  // Multiplayer end-game
  const [winner, setWinner] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<any>(null);

  // ---------------------------------------------------------
  // LOAD QUESTIONS
  // ---------------------------------------------------------
  useEffect(() => {
    async function load() {
      setLoading(true);

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, difficulty }),
      });

      const data = await res.json();

      if (data.ok) {
        setQuestions(data.data);
      }

      setLoading(false);
    }

    load();
  }, [category, difficulty]);

  const current = questions[index];

  const answers = useMemo(() => {
    if (!current) return [];

    return [
      { text: current.correct_answer, isCorrect: true },
      ...current.incorrect_answers.map((txt) => ({
        text: txt,
        isCorrect: false,
      })),
    ].sort(() => Math.random() - 0.5);
  }, [current]);

  // ---------------------------------------------------------
  // PICK ANSWER
  // ---------------------------------------------------------
  function pick(option: AnswerOption) {
    if (!selected) {
      setSelected(option.text);
      if (option.isCorrect) setScore((s) => s + 1);
    }
  }

  // ---------------------------------------------------------
  // NEXT QUESTION
  // ---------------------------------------------------------
  function next() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      // FINISH
      setFinished(true);
    }
  }

  // ---------------------------------------------------------
  // SEND SCORE TO SERVER (MULTIPLAYER)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!finished || !multiplayer || !room) return;

    async function sendScore() {
      const player = isHost ? "host" : "guest";

      const res = await fetch("/api/rooms/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, player, score }),
      });

      const data = await res.json();

      // If both players finished
      if (data.finished) {
        setWinner(data.winner);
        setFinalScores(data.scores);
      }
    }

    sendScore();
  }, [finished, multiplayer, room, score, isHost]);

  // ---------------------------------------------------------
  // LISTEN FOR FINAL SCORE EVENT
  // ---------------------------------------------------------
  useEffect(() => {
    if (!multiplayer || !room) return;

    const channel = pusherClient.subscribe(`room-${room}`);

    channel.bind("score-final", (data: any) => {
      setWinner(data.winner);
      setFinalScores(data.scores);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`room-${room}`);
    };
  }, [multiplayer, room]);

  // ---------------------------------------------------------
  // GO TO FEEDBACK
  // ---------------------------------------------------------
  function goFeedback() {
    if (!multiplayer) {
      router.push(
        `/feedback?score=${score}&total=${questions.length}&category=${category}&difficulty=${difficulty}`
      );
      return;
    }

    if (winner && finalScores) {
      router.push(
        `/feedback?winner=${winner}&hostScore=${finalScores.host}&guestScore=${finalScores.guest}`
      );
    }
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  if (loading || !current) {
    return <div className="quiz-container"><h1>Loading…</h1></div>;
  }

  if (finished) {
    const waiting = multiplayer && !winner;

    return (
      <div className="quiz-container">
        <h1>Game Over</h1>

        {!multiplayer && (
          <p>
            Score: {score}/{questions.length}
          </p>
        )}

        {multiplayer && (
          <>
            <p>Your score: {score}</p>

            {!winner && <p>Waiting for opponent…</p>}

            {winner && (
              <>
                <h2>
                  Winner:{" "}
                  {winner === "draw"
                    ? "Draw"
                    : winner === "host"
                    ? "Host"
                    : "Guest"}
                </h2>
                <p>Host: {finalScores?.host}</p>
                <p>Guest: {finalScores?.guest}</p>
              </>
            )}
          </>
        )}

        <button
          className="next-btn"
          disabled={waiting}
          onClick={goFeedback}
          style={{ marginTop: 20 }}
        >
          {waiting ? "Waiting…" : "Continue"}
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h2>
        Question {index + 1} / {questions.length}
      </h2>

      <div
        dangerouslySetInnerHTML={{ __html: current.question }}
        style={{ marginBottom: 20 }}
      />

      {answers.map((a) => {
        const isSel = selected === a.text;

        return (
          <button
            key={a.text}
            className="next-btn"
            style={{
              background:
                selected && a.isCorrect
                  ? "green"
                  : isSel
                  ? "red"
                  : "white",
            }}
            onClick={() => pick(a)}
            dangerouslySetInnerHTML={{ __html: a.text }}
          />
        );
      })}

      {selected && (
        <button className="next-btn" onClick={next} style={{ marginTop: 20 }}>
          Next
        </button>
      )}
    </div>
  );
}
