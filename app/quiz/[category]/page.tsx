"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";

interface Question {
  question: string;
  options: string[];
  answer: number;
}

const fallbackQuestions: Question[] = [
  {
    question: "What is the capital of France?",
    options: ["Paris", "London", "Berlin", "Rome"],
    answer: 0,
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Saturn"],
    answer: 1,
  },
  {
    question: "What does HTML stand for?",
    options: [
      "Hyper Text Markup Language",
      "Home Tool Markup Language",
      "Hyperlinks and Text Markup Language",
      "Hyper Tool Multi Language",
    ],
    answer: 0,
  },
];

export default function QuizPage() {
  const router = useRouter();

  // URL params
  const params = useParams();
  const category = params.category as string;

  const searchParams = useSearchParams();
  const difficulty = searchParams.get("difficulty") || "";

  // Multiplayer flags
  const isMultiplayer = searchParams.get("multiplayer") === "1";
  const room = searchParams.get("room");
  const isHost = searchParams.get("host") === "1";

  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------------------------------
  // MULTIPLAYER LISTENERS
  // ------------------------------------------------------------------------------
  useEffect(() => {
    if (!isMultiplayer || !room) return;

    const channelName = `room-${room}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("questions-loaded", (data: any) => {
      if (isHost) return;
      const qs: Question[] = data.questions;
      setQuestions(qs);
      setStep(0);
      setScore(0);
      setPicked(null);
      setLoading(false);
    });

    channel.bind("next-question", (data: any) => {
      const nextStep = data.step as number;
      setPicked(null);
      setStep(nextStep);
    });

    channel.bind("end-game", () => {
      router.push("/feedback");
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [isMultiplayer, room, isHost, router]);

  // ------------------------------------------------------------------------------
  // LOAD QUESTIONS
  // ------------------------------------------------------------------------------
  useEffect(() => {
    async function loadQuestions() {
      if (!category) return;

      // Guest waits for host
      if (isMultiplayer && !isHost) {
        setLoading(true);
        return;
      }

      setLoading(true);

      try {
        let url = `https://opentdb.com/api.php?amount=5&category=${category}&type=multiple`;

        if (difficulty) {
          url += `&difficulty=${difficulty}`;
        }

        const res = await fetch(url);

        // Rate limit fallback
        if (res.status === 429) {
          console.warn("Rate limited (429). Using fallback questions.");

          const formatted = fallbackQuestions;

          setQuestions(formatted);
          setStep(0);
          setScore(0);
          setPicked(null);

          if (isMultiplayer && isHost && room) {
            await fetch("/api/quiz/init", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ room, questions: formatted }),
            });
          }

          return;
        }

        if (!res.ok) {
          console.error("Failed to fetch questions", res.status);
          setQuestions([]);
          return;
        }

        const data = await res.json();

        if (!data.results || data.results.length === 0) {
          console.error("Unexpected or empty API response:", data);
          setQuestions([]);
          return;
        }

        const formatted: Question[] = data.results.map((q: any) => {
          const options = [...q.incorrect_answers];
          const randomIndex = Math.floor(
            Math.random() * (options.length + 1)
          );
          options.splice(randomIndex, 0, q.correct_answer);

          return {
            question: q.question,
            options,
            answer: randomIndex,
          };
        });

        setQuestions(formatted);
        setStep(0);
        setScore(0);
        setPicked(null);

        // Host sends questions to guest
        if (isMultiplayer && isHost && room) {
          await fetch("/api/quiz/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, questions: formatted }),
          });
        }
      } catch (err) {
        console.error("Error loading questions:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, [category, difficulty, isMultiplayer, isHost, room]);

  // ------------------------------------------------------------------------------
  // NEXT QUESTION
  // ------------------------------------------------------------------------------
  async function next() {
    if (picked === null) return;

    if (picked === questions[step].answer) {
      setScore((s) => s + 1);
    }

    const nextStep = step + 1;

    if (isMultiplayer && isHost && room) {
      await fetch("/api/quiz/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, step: nextStep }),
      });
    }

    setPicked(null);
    setStep(nextStep);
  }

  // ------------------------------------------------------------------------------
  // FINISH HANDLER (SAFE REDIRECT)
  // ------------------------------------------------------------------------------
  useEffect(() => {
    const finished =
      !loading && questions.length > 0 && step === questions.length;

    if (!finished) return;

    if (isMultiplayer && isHost && room) {
      fetch("/api/quiz/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
      }).catch(() => {});
    }

    router.push("/feedback");
  }, [loading, questions.length, step, isMultiplayer, isHost, room, router]);

  // ------------------------------------------------------------------------------
  // SAFETY BLOCKS (PREVENT RENDER CRASH)
  // ------------------------------------------------------------------------------
  if (loading) {
    return <div className="quiz-container">Loading…</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-container">
        <h2>No questions found.</h2>
      </div>
    );
  }

  if (step < 0 || step >= questions.length) {
    return <div className="quiz-container">Finishing...</div>;
  }

  // ------------------------------------------------------------------------------
  // MAIN UI
  // ------------------------------------------------------------------------------
  return (
    <div className="quiz-container">
      <h2
        className="question-text"
        dangerouslySetInnerHTML={{ __html: questions[step].question }}
      />

      <p style={{ opacity: 0.7, fontSize: 14 }}>
        Category: <strong>{category}</strong> | Difficulty:{" "}
        <strong>{difficulty || "any"}</strong>{" "}
        {isMultiplayer && (
          <>
            | Mode: <strong>{isHost ? "Host" : "Guest"}</strong>
          </>
        )}
      </p>

      {questions[step].options.map((op, index) => (
        <button
          key={index}
          className={`option-btn ${picked === index ? "selected" : ""}`}
          onClick={() => setPicked(index)}
          dangerouslySetInnerHTML={{ __html: op }}
        />
      ))}

      <button
        className="next-btn"
        disabled={picked === null || (isMultiplayer && !isHost)}
        onClick={next}
      >
        {isMultiplayer && !isHost ? "Waiting for host..." : "Next"}
      </button>

      <div className="progress">
        <div
          className="bar"
          style={{ width: `${(step / questions.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
