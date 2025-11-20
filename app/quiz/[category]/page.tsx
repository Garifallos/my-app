"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

interface Question {
  question: string;
  options: string[];
  answer: number;
}

export default function QuizPage() {
  // ---------------- ROUTER ----------------
  const router = useRouter();

  // ---------------- ROUTE PARAMS ----------------
  const params = useParams<{ category: string }>();
  const category = params.category;

  const searchParams = useSearchParams();
  const difficulty = searchParams.get("difficulty") || "";

  // ---------------- STATE ----------------
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);

  // ---------------- LOAD QUESTIONS ----------------
  useEffect(() => {
    async function loadQuestions() {
      if (!category) return;

      setLoading(true);

      let url = `https://opentdb.com/api.php?amount=5&category=${category}&type=multiple`;

      if (difficulty) {
        url += `&difficulty=${difficulty}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      const formatted: Question[] = data.results.map((q: any) => {
        const options = [...q.incorrect_answers];
        const randomIndex = Math.floor(Math.random() * (options.length + 1));
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
      setLoading(false);
    }

    loadQuestions();
  }, [category, difficulty]);

  // ---------------- NEXT QUESTION ----------------
  function next() {
    if (picked === questions[step].answer) {
      setScore((s) => s + 1);
    }

    setPicked(null);
    setStep((s) => s + 1);
  }

  // ---------------- AUTO REDIRECT WHEN FINISHED ----------------
  useEffect(() => {
    if (questions.length > 0 && step === questions.length) {
      router.push("/feedback");
    }
  }, [step, questions.length, router]);

  // ---------------- UI STATES ----------------
  if (loading) {
    return <div className="quiz-container">Loading…</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-container">
        <h2>No questions found.</h2>
        <p>Try a different category or difficulty.</p>
      </div>
    );
  }

  // IMPORTANT: DO NOT RENDER QUIZ AFTER FINISH
  if (step === questions.length) return null;

  // ---------------- MAIN UI ----------------
  return (
    <div className="quiz-container">
      {/* QUESTION */}
      <h2
        className="question-text"
        dangerouslySetInnerHTML={{ __html: questions[step].question }}
      />

      {/* OPTIONS */}
      {questions[step].options.map((op, index) => (
        <button
          key={index}
          className={`option-btn ${picked === index ? "selected" : ""}`}
          onClick={() => setPicked(index)}
          dangerouslySetInnerHTML={{ __html: op }}
        />
      ))}

      {/* NEXT BUTTON */}
      <button
        disabled={picked === null}
        className="next-btn"
        onClick={next}
      >
        Next
      </button>

      {/* PROGRESS BAR */}
      <div className="progress">
        <div
          className="bar"
          style={{ width: `${(step / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
