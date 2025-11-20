"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

interface Question {
  question: string;
  options: string[];
  answer: number;
}

export default function QuizPage() {
  const router = useRouter();

  // URL params
  const params = useParams();
  const category = params.category as string;

  const searchParams = useSearchParams();
  const difficulty = searchParams.get("difficulty") || "";

  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Load questions when URL changes
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

  // Move to next question
  function next() {
    if (picked === questions[step].answer) {
      setScore((s) => s + 1);
    }
    setPicked(null);
    setStep((s) => s + 1);
  }

  // Loading state
  if (loading) return <div className="quiz-container">Loading…</div>;

  // No questions returned
  if (questions.length === 0) {
    return (
      <div className="quiz-container">
        <h2>No questions found.</h2>
      </div>
    );
  }

  // QUIZ FINISHED → redirect to feedback
  if (step === questions.length) {
    router.push("/feedback");
    return null; // avoid UI crash
  }

  // MAIN UI
  return (
    <div className="quiz-container">
      <h2
        className="question-text"
        dangerouslySetInnerHTML={{ __html: questions[step].question }}
      />

      <p style={{ opacity: 0.7, fontSize: 14 }}>
        Category: <strong>{category}</strong> | Difficulty:{" "}
        <strong>{difficulty || "any"}</strong>
      </p>

      {questions[step].options.map((op, index) => (
        <button
          key={index}
          className={`option-btn ${picked === index ? "selected" : ""}`}
          onClick={() => setPicked(index)}
          dangerouslySetInnerHTML={{ __html: op }}
        />
      ))}

      <button className="next-btn" disabled={picked === null} onClick={next}>
        Next
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
