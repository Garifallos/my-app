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

type Scores = {
  host?: number;
  guest?: number;
};

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

  // ---------------------------------------------------------
  // Read parameters
  // ---------------------------------------------------------
  const categoryRaw = params.category; 
  const category = categoryRaw ? Number(categoryRaw) : null;

  const difficultyRaw = searchParams.get("difficulty");
  const difficulty =
    difficultyRaw && difficultyRaw !== "" ? difficultyRaw : null;

  const multiplayer = searchParams.get("multiplayer") === "1";
  const room = searchParams.get("room");
  const isHost = searchParams.get("host") === "1";

  // ---------------------------------------------------------
  // Prevent early loading (THE FIX!)
  // ---------------------------------------------------------
  const paramsReady =
    category !== null &&
    !isNaN(Number(category)) &&
    room !== null &&
    room !== undefined;

  // Μην κάνεις render ΟΥΤΕ fetch πριν έρθουν τα κατάλληλα URL params
  if (!paramsReady) {
    return (
      <div className="quiz-container">
        <h1>Preparing quiz…</h1>
      </div>
    );
  }

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const [showResults, setShowResults] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Scores | null>(null);

  // ---------------------------------------------------------
  // Load Questions (AFTER paramsReady)
  // ---------------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            category,
            difficulty,
          }),
        });

        const data = await response.json();

        if (data.ok && Array.isArray(data.data)) {
          setQuestions(data.data);
        } else {
          setQuestions([]); 
        }
      } catch (err) {
        console.error("Failed to load questions:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }

    if (paramsReady) {
      load();
    }
  }, [category, difficulty, room, paramsReady]);

  const currentQuestion = questions[currentIndex];

  const shuffledAnswers: AnswerOption[] = useMemo(() => {
    if (!currentQuestion) return [];
    return shuffleArray<AnswerOption>([
      { text: currentQuestion.correct_answer, isCorrect: true },
      ...currentQuestion.incorrect_answers.map((t) => ({
        text: t,
        isCorrect: false,
      })),
    ]);
  }, [currentQuestion]);

  // ---------------------------------------------------------
  // HANDLE ANSWER
  // ---------------------------------------------------------
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
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  }

  // ---------------------------------------------------------
  // MULTIPLAYER: SEND SCORE
  // ---------------------------------------------------------
  useEffect(() => {
    if (!showResults || !multiplayer) return;
    if (!room) return;

    async function sendScore() {
      const playerType: "host" | "guest" = isHost ? "host" : "guest";

      try {
        const res = await fetch("/api/rooms/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            room,
            player: playerType,
            score,
          }),
        });

        const data = await res.json();

        if (data.finished) {
          setWinner(data.result);
          setFinalScores({
            host: data.scores?.host ?? 0,
            guest: data.scores?.guest ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to send score", err);
      }
    }

    sendScore();
  }, [showResults, multiplayer, room, score, isHost]);

  // ---------------------------------------------------------
  // MULTIPLAYER: RECEIVE FINAL
  // ---------------------------------------------------------
  useEffect(() => {
    if (!multiplayer || !room) return;

    const channel = pusherClient.subscribe(`room-${room}`);

    channel.bind("score-final", (data: any) => {
      setWinner(data.winner);
      setFinalScores(data.scores);
    });

    return () => {
      channel.unbind("score-final");
      pusherClient.unsubscribe(`room-${room}`);
    };
  }, [multiplayer, room]);

  // ---------------------------------------------------------
  // FEEDBACK
  // ---------------------------------------------------------
  function goToFeedback() {
    if (!multiplayer) {
      router.push(
        `/feedback?category=${category}&difficulty=${difficulty}&score=${score}&total=${questions.length}`
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
  // LOADING
  // ---------------------------------------------------------
  if (loading) {
    return (
      <div className="quiz-container">
        <h1>Loading questions…</h1>
      </div>
    );
  }

  // ---------------------------------------------------------
  // NO QUESTIONS (SHOULD NOT HAPPEN NOW)
  // ---------------------------------------------------------
  if ((!currentQuestion || questions.length === 0) && !showResults) {
    return (
      <div className="quiz-container">
        <h1>No questions found</h1>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RESULTS
  // ---------------------------------------------------------
  if (showResults) {
    const waiting = multiplayer && !winner;

    return (
      <div className="quiz-container">
        <h1>Game Over!</h1>

        {multiplayer && (
          <>
            <p>Your score: {score}</p>
            {!winner && <p>Waiting for opponent…</p>}

            {winner && (
              <div style={{ marginTop: 20 }}>
                {winner === "draw" && <h2>Draw! 🤝</h2>}
                {winner === "host" && (
                  <h2>Winner: Host {isHost && "(You)"} 🎉</h2>
                )}
                {winner === "guest" && (
                  <h2>Winner: Guest {!isHost && "(You)"} 🎉</h2>
                )}

                <p>Host score: {finalScores?.host}</p>
                <p>Guest score: {finalScores?.guest}</p>
              </div>
            )}
          </>
        )}

        {!multiplayer && (
          <p>
            Your score: {score} / {questions.length}
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

  // ---------------------------------------------------------
  // MAIN QUIZ UI
  // ---------------------------------------------------------
  return (
    <div className="quiz-container">
      <h1>Quiz</h1>

      {multiplayer && (
        <p>
          Room: {room} ({isHost ? "Host" : "Guest"})
        </p>
      )}

      <h3>
        Question {currentIndex + 1} / {questions.length}
      </h3>

      <div
        style={{
          marginBottom: 20,
          padding: 20,
          borderRadius: 10,
          background: "rgba(0,0,0,0.1)",
        }}
        dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
      />

      <div style={{ display: "grid", gap: 10 }}>
        {shuffledAnswers.map((option) => {
          const selected = selectedAnswer === option.text;
          const correct = option.isCorrect;

          let bg = "rgba(255,255,255,0.1)";

          if (isAnswered) {
            if (correct) bg = "rgba(0,200,0,0.4)";
            else if (selected) bg = "rgba(200,0,0,0.4)";
          } else if (selected) {
            bg = "rgba(255,255,255,0.3)";
          }

          return (
            <button
              key={option.text}
              className="next-btn"
              style={{ background: bg }}
              onClick={() => handleAnswer(option)}
              dangerouslySetInnerHTML={{ __html: option.text }}
            />
          );
        })}
      </div>

      {isAnswered && (
        <button
          className="next-btn"
          onClick={nextQuestion}
          style={{ marginTop: 20 }}
        >
          {currentIndex + 1 === questions.length ? "Finish" : "Next Question"}
        </button>
      )}

      <p style={{ marginTop: 20 }}>Score: {score}</p>
    </div>
  );
}
