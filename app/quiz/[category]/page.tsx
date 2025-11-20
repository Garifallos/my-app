"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface Question {
  question: string;
  options: string[];
  answer: number;
}

export default function CategoryQuizPage() {
  // ---------------- ROUTE PARAM ----------------
  const params = useParams<{ category: string }>();
  const category = params.category; // π.χ. "18"

  // ---------------- QUERY PARAM ----------------
  const searchParams = useSearchParams();
  const difficulty = searchParams.get("difficulty") || ""; // π.χ. "easy"

  // ---------------- STATE ----------------
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // ---------------- LOAD QUESTIONS ----------------
  useEffect(() => {
    async function load() {
      if (!category) return;

      setLoading(true);

      // Build API URL
      let url = `https://opentdb.com/api.php?amount=5&category=${category}&type=multiple`;

      if (difficulty) {
        url += `&difficulty=${difficulty}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      const formatted = data.results.map((q: any) => {
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

    load();
  }, [category, difficulty]);

  // ---------------- NEXT QUESTION ----------------
  function next() {
    if (picked === questions[step].answer) {
      setScore((prev) => prev + 1);
    }

    setPicked(null);
    setStep((prev) => prev + 1);
  }

  // ---------------- LOADING STATE ----------------
  if (loading) {
    return <div className="quiz-container">Loading…</div>;
  }

  // ---------------- NO QUESTIONS FOUND ----------------
  if (!loading && questions.length === 0) {
    return (
      <div className="quiz-container">
        <h2>No questions found</h2>
        <p>
          Try a different category or difficulty.  
          <br />
          <code>/quiz/{category}?difficulty={difficulty}</code>
        </p>
      </div>
    );
  }

  // ---------------- END SCREEN ----------------
  if (step === questions.length) {
    return (
      <div className="quiz-container">
        <h1>Score: {score} / {questions.length}</h1>

        <button
          className="next-btn"
          onClick={() => {
            setStep(0);
            setScore(0);
            setPicked(null);
          }}
        >
          Restart
        </button>
      </div>
    );
  }

  // ---------------- MAIN UI ----------------
  return (
    <div className="quiz-container">
      <h2
        className="question-text"
        dangerouslySetInnerHTML={{ __html: questions[step].question }}
      />

      <p style={{ opacity: 0.7 }}>
        Category: <strong>{category}</strong>  
        {difficulty && <> | Difficulty: <strong>{difficulty}</strong></>}
      </p>

      {questions[step].options.map((op, index) => (
        <button
          key={index}
          className={`option-btn ${picked === index ? "selected" : ""}`}
          onClick={() => setPicked(index)}
          dangerouslySetInnerHTML={{ __html: op }}
        ></button>
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
