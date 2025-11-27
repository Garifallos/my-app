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

  // HYDRATION
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // PARAMS
  const rawCategory = params.category;
  const category =
    typeof rawCategory === "string"
      ? Number(rawCategory)
      : Array.isArray(rawCategory)
      ? Number(rawCategory[0])
      : NaN;

  const difficulty = searchParams.get("difficulty") ?? "";
  const multiplayer = searchParams.get("multiplayer") === "1";
  const room = searchParams.get("room");
  const isHost = searchParams.get("host") === "1";

  // PARAMS READY FIX
  const [paramsReady, setParamsReady] = useState(false);
  useEffect(() => {
    if (
      hydrated &&
      !Number.isNaN(category) &&
      (room || !multiplayer)
    ) {
      setParamsReady(true);
    }
  }, [hydrated, category, room, multiplayer]);

  // STATES
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostQuestionsReady, setHostQuestionsReady] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const [showResults, setShowResults] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Scores | null>(null);

  // LOAD QUESTIONS (ONLY for GUEST or SINGLE PLAYER)
  useEffect(() => {
    if (!paramsReady) return;
    if (multiplayer && isHost) return; // HOST DOES NOT FETCH DIRECTLY

    async function load() {
      setLoading(true);
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
  }, [paramsReady, category, difficulty, multiplayer, isHost]);

  // HOST waits for Pusher event
  useEffect(() => {
    if (!(multiplayer && isHost && room)) return;

    const channel = pusherClient.subscribe(`room-${room}`);

    channel.bind("questions-ready", (data: any) => {
      console.log("🔥 Host received questions:", data);
      setQuestions(data.questions);
      setHostQuestionsReady(true);
      setLoading(false);
    });

    // Host triggers backend to prepare questions
    fetch("/api/rooms/start", {
      method: "POST",
      body: JSON.stringify({ room, category, difficulty }),
    });

    return () => {
      channel.unbind("questions-ready");
      pusherClient.unsubscribe(`room-${room}`);
    };
  }, [multiplayer, isHost, room, category, difficulty]);

  const currentQuestion = questions[currentIndex];

  const shuffledAnswers = useMemo(() => {
    if (!currentQuestion) return [];
    return shuffleArray([
      { text: currentQuestion.correct_answer, isCorrect: true },
      ...currentQuestion.incorrect_answers.map((t) => ({
        text: t,
        isCorrect: false,
      })),
    ]);
  }, [currentQuestion]);

  // HANDLE ANSWER
  function handleAnswer(option: AnswerOption) {
    if (isAnswered) return;
    setSelectedAnswer(option.text);
    setIsAnswered(true);
    if (option.isCorrect) setScore((s) => s + 1);
  }

  function nextQuestion() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  }

  // SEND SCORE
  useEffect(() => {
    if (!showResults || !multiplayer) return;
    if (!room) return;

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
  }, [showResults, room, multiplayer, score, isHost]);

  // RECEIVE SCORE
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

  // FEEDBACK NAVIGATION
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

  // FINAL LOADING FIX
  if (
    !paramsReady ||
    loading ||
    (!currentQuestion && !showResults) ||
    (multiplayer && isHost && !hostQuestionsReady)
  ) {
    return (
      <div className="quiz-container">
        <h1>Loading quiz…</h1>
      </div>
    );
  }

  // RESULTS
  if (showResults) {
    const waiting = multiplayer && !winner;

    return (
      <div className="quiz-container">
        <h1>Game Over!</h1>

        {!multiplayer ? (
          <p>Your score: {score} / {questions.length}</p>
        ) : (
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
          onClick={goToFeedback}
          style={{ marginTop: 20 }}
        >
          {waiting ? "Waiting…" : "Continue"}
        </button>
      </div>
    );
  }

  // MAIN UI
  return (
    <div className="quiz-container">
      <h1>Quiz</h1>

      {multiplayer && (
        <div style={{ opacity: 0.7, marginBottom: 10 }}>
          <p>Room: {room}</p>
          <p>{isHost ? "You are the HOST" : "You are the GUEST"}</p>
        </div>
      )}

      <h3>
        Question {currentIndex + 1}/{questions.length}
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
          style={{ marginTop: 20 }}
          onClick={nextQuestion}
        >
          {currentIndex + 1 === questions.length
            ? "Finish"
            : "Next Question"}
        </button>
      )}

      <p style={{ marginTop: 20 }}>Score: {score}</p>
    </div>
  );
}
