"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

interface Question {
  question: string;
  options: string[];
  answer: number;
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams<{ category: string }>();
  const searchParams = useSearchParams();

  const category = params.category;
  const difficultyFromUrl = searchParams.get("difficulty") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // ----------------------------------------------------
  // LOAD QUESTIONS
  // ----------------------------------------------------
  useEffect(() => {
    async function loadQuestions() {
      if (!category) return;
      setLoading(true);

      let url = `https://opentdb.com/api.php?amount=5&category=${category}&type=multiple`;
      if (difficultyFromUrl) url += `&difficulty=${difficultyFromUrl}`;

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

  // ----------------------------------------------------
  // REDIRECT TO FEEDBACK WHEN QUIZ ENDS
  // ----------------------------------------------------
  useEffect(() => {
    if (questions.length > 0 && step === questions.length) {
      router.push("/feedback"); // <-- redirect works 100% now
    }
  }, [step, questions.length, router]);

  // ----------------------------------------------------
  // NEXT QUESTION
  // ----------------------------------------------------
  function next() {
    if (picked === questions[step].answer) {
      setScore((s) => s + 1);
    }
    setPicked(null);
    setStep((s) => s + 1);
  }

  // ----------------------------------------------------
  // LOADING SCREEN
  // ----------------------------------------------------
  if (loading) {
    return <div className="quiz-container">Loading…</div>;
  }

  // ----------------------------------------------------
  // NO QUESTIONS FOUND
  // ----------------------------------------------------
  if (!loading && questions.length === 0) {
    return (
      <div className="quiz-container">
        <h2>No questions found</h2>
        <p>
          URL tried: <code>/quiz/{category}?difficulty={difficultyFromUrl}</code>
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN QUIZ UI
  // ----------------------------------------------------
  return (
    <div className="quiz-container">
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

      <button
        disabled={picked === null}
        className="next-btn"
        onClick={next}
      >
        Next
      </button>

      {/* PROGRESS */}
      <div className="progress">
        <div
          className="bar"
          style={{
            width: `${(step / questions.length) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
}
