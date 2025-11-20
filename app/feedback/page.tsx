"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

interface Question {
  question: string;
  options: string[];
  answer: number;
}

export default function CategoryQuiz() {
  const router = useRouter();

  const params = useParams<{ category: string }>();
  const searchParams = useSearchParams();

  const category = params.category;
  const difficulty = searchParams.get("difficulty") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);

  // LOAD QUESTIONS
  useEffect(() => {
    async function load() {
      setLoading(true);

      let url = `https://opentdb.com/api.php?amount=5&category=${category}&type=multiple`;
      if (difficulty) url += `&difficulty=${difficulty}`;

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
      setLoading(false);
      setStep(0);
      setPicked(null);
      setScore(0);
    }

    load();
  }, [category, difficulty]);

  // NEXT
  function next() {
    if (picked === questions[step].answer) setScore((s) => s + 1);

    setPicked(null);
    setStep((s) => s + 1);
  }

  // REDIRECT TO FEEDBACK
  useEffect(() => {
    if (questions.length > 0 && step === questions.length) {
      router.push("/feedback");
    }
  }, [step, questions.length, router]);

  // UI STATES
  if (loading) return <div className="quiz-container">Loading…</div>;

  if (questions.length === 0)
    return <div className="quiz-container">No questions</div>;

  if (step === questions.length) return null; // avoid render flashing

  return (
    <div className="quiz-container">
      <h2
        className="question-text"
        dangerouslySetInnerHTML={{ __html: questions[step].question }}
      />

      {questions[step].options.map((op, i) => (
        <button
          key={i}
          className={`option-btn ${picked === i ? "selected" : ""}`}
          onClick={() => setPicked(i)}
          dangerouslySetInnerHTML={{ __html: op }}
        />
      ))}

      <button disabled={picked === null} className="next-btn" onClick={next}>
        Next
      </button>

      <div className="progress">
        <div
          className="bar"
          style={{ width: `${(step / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
