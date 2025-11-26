"use client";

import { useEffect, useState } from "react";
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

type Scores = {
  host?: number;
  guest?: number;
};

// Shuffle helper
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function QuizCategoryPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();

  // MUST BE FIRST HOOKS
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // ALL OTHER HOOKS BELOW ↓↓↓

  const category = Number(params.category);
  const difficulty = searchParams.get("difficulty") ?? "";
  const multiplayer = searchParams.get("multiplayer") === "1";

  const room = searchParams.get("room");
  const isHost = searchParams.get("host") === "1";

  // Main states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const [shuffledAnswers, setShuffledAnswers] = useState<AnswerOption[]>([]);

  const [showResults, setShowResults] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Scores | null>(null);

  // Redirect only after hydration
  useEffect(() => {
    if (!hydrated) return;

    if (!category || !room) {
      router.replace("/");
    }
  }, [hydrated, category, room, router]);

  // LOAD QUESTIONS
  useEffect(() => {
    if (!hydrated) return;

    async function load() {
      try {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ category, difficulty }),
        });

        const data = await res.json();

        if (data.ok && Array.isArray(data.data)) {
          setQuestions(data.data);
        } else {
          setQuestions([]);
        }
      } catch {
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [hydrated, category, difficulty]);

  const currentQuestion = questions[currentIndex];

  // shuffle answers safely
  useEffect(() => {
    if (!currentQuestion) return;

    const allAnswers: AnswerOption[] = [
      { text: currentQuestion.correct_answer, isCorrect: true },
      ...currentQuestion.incorrect_answers.map((t) => ({
        text: t,
        isCorrect: false,
      })),
    ];

    setShuffledAnswers(shuffleArray(allAnswers));
  }, [currentQuestion]);

  function handleAnswer(option: AnswerOption) {
    if (isAnswered) return;

    setSelectedAnswer(option.text);
    setIsAnswered(true);

    if (option.isCorrect) {
      setScore((prev) => prev + 1);
    }
  }

  function nextQuestion() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((p) => p + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  }

  // SEND SCORE (multiplayer)
  useEffect(() => {
    if (!showResults || !multiplayer) return;

    async function send() {
      const player = isHost ? "host" : "guest";

      const res = await fetch("/api/rooms/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, player, score }),
      });

      const data = await res.json();

      if (data.finished) {
        setWinner(data.result);
        setFinalScores(data.scores);
      }
    }

    send();
  }, [showResults, score, multiplayer, isHost, room]);

  // RECEIVE SCORE
  useEffect(() => {
    if (!multiplayer || !room) return;

    const channel = pusherClient.subscribe(`room-${room}`);

    channel.bind("score-final", (data: { winner: string; scores: Scores }) => {
      setWinner(data.winner);
      setFinalScores(data.scores);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`room-${room}`);
    };
  }, [multiplayer, room]);

  function goToFeedback() {
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

  // EARLY RETURNS BELOW ARE SAFE (hooks already declared above)

  if (!hydrated) {
    return (
      <div className="quiz-container">
        <h1>Preparing quiz…</h1>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="quiz-container">
        <h1>Loading questions…</h1>
      </div>
    );
  }

  if (!currentQuestion && !showResults) {
    return (
      <div className="quiz-container">
        <h1>No questions found</h1>
      </div>
    );
  }

  // RESULTS
  if (showResults) {
    const waiting = multiplayer && !winner;

    return (
      <div className="quiz-container">
        <h1>Game Over!</h1>

        {multiplayer ? (
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
        ) : (
          <p>
            Your score: {score}/{questions.length}
          </p>
        )}

        <button
          className="next-btn"
          disabled={waiting}
          onClick={goToFeedback}
          style={{ marginTop: 20 }}
        >
          {waiting ? "Waiting…" : "Continue"}
        </button>
      </div>
    );
  }

  // MAIN QUIZ
  return (
    <div className="quiz-container">
      <h1>Quiz</h1>

      {multiplayer && (
        <p>
          Room: {room} ({isHost ? "Host" : "Guest"})
        </p>
      )}

      <h3>
        Question {currentIndex + 1}/{questions.length}
      </h3>

      <div
        style={{
          padding: 20,
          background: "rgba(0,0,0,0.1)",
          borderRadius: 10,
          marginBottom: 20,
        }}
        dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
      />

      <div style={{ display: "grid", gap: 10 }}>
        {shuffledAnswers.map((option) => (
          <button
            key={option.text}
            className="next-btn"
            onClick={() => handleAnswer(option)}
            style={{
              background:
                isAnswered && option.isCorrect
                  ? "rgba(0,200,0,0.4)"
                  : isAnswered && selectedAnswer === option.text
                  ? "rgba(200,0,0,0.4)"
                  : selectedAnswer === option.text
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(255,255,255,0.1)",
            }}
            dangerouslySetInnerHTML={{ __html: option.text }}
          />
        ))}
      </div>

      {isAnswered && (
        <button className="next-btn" onClick={nextQuestion} style={{ marginTop: 20 }}>
          {currentIndex + 1 === questions.length ? "Finish" : "Next Question"}
        </button>
      )}

      <p style={{ marginTop: 20 }}>Score: {score}</p>
    </div>
  );
}
