"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

interface Question {
  question: string;
  options: string[];
  answer: number;
}

export default function Page() {
  const router = useRouter();
  const params = useParams<{ category: string }>();
  const category = params.category;

  const searchParams = useSearchParams();
  const difficultyFromUrl = searchParams.get("difficulty") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  // THEME LOAD
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial = saved ? saved : "light";
    setTheme(initial);
    document.body.classList.toggle("dark", initial === "dark");
  }, []);

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.body.classList.toggle("dark", newTheme === "dark");
  }

  // LOAD QUESTIONS BASED ON URL
  useEffect(() => {
    async function loadQuestions() {
      if (!category) return;
      setLoading(true);

      let url = `https://opentdb.com/api.php?amount=5&category=${category}&type=multiple`;

      if (difficultyFromUrl) {
        url += `&difficulty=${difficultyFromUrl}`;
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
  }, [category, difficultyFromUrl]);

  // REDIRECT WHEN QUIZ ENDS
  useEffect(() => {
    if (questions.length > 0 && step === questions.length) {
      router.push("/feedback");
    }
  }, [step, questions.length, router]);

  // STOP UI RENDER WHEN REDIRECTING
  if (step === questions.length) return null;

  function next() {
    if (picked === questions[step].answer) {
      setScore((s) => s + 1);
    }
    setPicked(null);
    setStep((s) => s + 1);
  }

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

  return (
    <>
      {/* THEME BUTTON */}
      <div
        className={`theme-switch ${theme === "dark" ? "dark" : ""}`}
        onClick={toggleTheme}
      >
        <span className="switch-icon sun">☀️</span>
        <span className="switch-icon moon">🌙</span>
        <div className="switch-circle"></div>
      </div>

      <div className="quiz-container">
        <h2
          className="question-text"
          dangerouslySetInnerHTML={{ __html: questions[step].question }}
        />

        <p>
          Category: <strong>{category}</strong>
          {difficultyFromUrl && (
            <>
              {" "} | Difficulty: <strong>{difficultyFromUrl}</strong>
            </>
          )}
        </p>

        {/* OPTIONS */}
        {questions[step].options.map((op, index) => (
          <button
            key={index}
            className={`option-btn ${picked === index ? "selected" : ""}`}
            onClick={() => setPicked(index)}
            dangerouslySetInnerHTML={{ __html: op }}
          ></button>
        ))}

        <button disabled={picked === null} className="next-btn" onClick={next}>
          Next
        </button>

        <div className="progress">
          <div
            className="bar"
            style={{ width: `${(step / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </>
  );
}
