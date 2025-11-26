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

  const category = params.category as string;
  const difficulty = searchParams.get("difficulty") ?? "";
  const multiplayer = searchParams.get("multiplayer") === "1";
  const room = searchParams.get("room");
  const isHost = searchParams.get("host") === "1";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const [showResults, setShowResults] = useState(false);

  const [winner, setWinner] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Scores | null>(null);

  // -------------------------------------------------------
  // LOAD QUESTIONS
  // -------------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, difficulty }),
        });

        const data = await res.json();

        if (data.ok && Array.isArray(data.data)) {
          setQuestions(data.data);
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.error("Failed to load questions", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [category, difficulty]);

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

  // -------------------------------------------------------
  // HANDLE ANSWER
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // MULTIPLAYER: SEND SCORE WHEN FINISHED
  // -------------------------------------------------------
  useEffect(() => {
    if (!showResults || !multiplayer) return;
    if (!room) return;

    async function sendScore() {
      const playerType: "host" | "guest" = isHost ? "host" : "guest";

      try {
        const res = await fetch("/api/rooms/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room,
            player: playerType,
            score,
          }),
        });

        const data = await res.json();
        console.log("Score response:", data);

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

  // -------------------------------------------------------
  // MULTIPLAYER: LISTEN FOR FINAL RESULT (PUSHER)
  // -------------------------------------------------------
  useEffect(() => {
    if (!multiplayer || !room) return;

    const channel = pusherClient.subscribe(`room-${room}`);

    channel.bind("score-final", (data: any) => {
      console.log("Received score-final:", data);
      setWinner(data.winner);
      setFinalScores(data.scores);
    });

    return () => {
      channel.unbind("score-final");
      pusherClient.unsubscribe(`room-${room}`);
    };
  }, [multiplayer, room]);

  // -------------------------------------------------------
  // GO TO FEEDBACK
  // -------------------------------------------------------
  function goToFeedback() {
    if (!multiplayer) {
      router.push(
        `/feedback?category=${category}&difficulty=${difficulty}&score=${score}&total=${questions.length}`
      );
      return;
    }

    if (winner && finalScores) {
      const hostScore = finalScores.host ?? 0;
      const guestScore = finalScores.guest ?? 0;

      router.push(
        `/feedback?winner=${winner}&hostScore=${hostScore}&guestScore=${guestScore}&category=${category}&difficulty=${difficulty}`
      );
    }
  }

  // -------------------------------------------------------
  // LOADING
  // -------------------------------------------------------
  if (loading) {
    return (
      <div className="quiz-container">
        <h1>Loading questions...</h1>
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

  // -------------------------------------------------------
  // RESULTS SCREEN
  // -------------------------------------------------------
  if (showResults) {
    const waiting = multiplayer && !winner;

    return (
      <div className="quiz-container">
        <h1>Game Over!</h1>

        {!multiplayer && (
          <p>
            Your score: {score} / {questions.length}
          </p>
        )}

        {multiplayer && (
          <>
            <p>Your score: {score}</p>

            {!winner && (
              <p style={{ marginTop: 10, opacity: 0.8 }}>
                Waiting for the other player to finish...
              </p>
            )}

            {winner && (
              <div style={{ marginTop: 20 }}>
                {winner === "draw" && <h2>Draw! 🤝</h2>}
                {winner === "host" && (
                  <h2>
                    Winner: HOST {isHost && "(You)"} 🎉
                  </h2>
                )}
                {winner === "guest" && (
                  <h2>
                    Winner: GUEST {!isHost && "(You)"} 🎉
                  </h2>
                )}

                <p style={{ marginTop: 10 }}>
                  Host score: {finalScores?.host ?? 0}
                </p>
                <p>Guest score: {finalScores?.guest ?? 0}</p>
              </div>
            )}
          </>
        )}

        <button
          className="next-btn"
          style={{ marginTop: 30, opacity: waiting ? 0.5 : 1 }}
          disabled={waiting}
          onClick={goToFeedback}
        >
          {waiting ? "Waiting for opponent..." : "Go to Feedback"}
        </button>

        <button
          className="next-btn"
          style={{ marginTop: 10, background: "rgba(255,255,255,0.1)" }}
          onClick={() => router.push("/")}
        >
          Back to Home
        </button>
      </div>
    );
  }

  // -------------------------------------------------------
  // MAIN QUIZ UI
  // -------------------------------------------------------
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
          style={{ marginTop: 20 }}
          onClick={nextQuestion}
        >
          {currentIndex + 1 === questions.length
            ? "Show Results"
            : "Next Question"}
        </button>
      )}

      <p style={{ marginTop: 20 }}>Score: {score}</p>
    </div>
  );
}
