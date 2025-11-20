"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();

  const category = params.category;
  const difficulty = search.get("difficulty") || "";

  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!category) return;

      let url = `https://opentdb.com/api.php?amount=5&category=${category}&type=multiple`;
      if (difficulty) url += `&difficulty=${difficulty}`;

      const res = await fetch(url);
      const data = await res.json();

      const formatted = data.results.map((q) => {
        const opts = [...q.incorrect_answers];
        const rand = Math.floor(Math.random() * (opts.length + 1));
        opts.splice(rand, 0, q.correct_answer);

        return {
          question: q.question,
          options: opts,
          answer: rand,
        };
      });

      setQuestions(formatted);
      setLoading(false);
    }

    load();
  }, [category, difficulty]);

  if (loading) return <div className="quiz-container">Loading…</div>;
  if (!questions.length) return <div>No questions found</div>;
  if (step === questions.length) router.push("/feedback");

  return (
    <div className="quiz-container">
      <h2 dangerouslySetInnerHTML={{ __html: questions[step].question }} />

      {questions[step].options.map((op, i) => (
        <button
          key={i}
          className={picked === i ? "selected option-btn" : "option-btn"}
          onClick={() => setPicked(i)}
          dangerouslySetInnerHTML={{ __html: op }}
        />
      ))}

      <button disabled={picked === null} onClick={() => setStep(step + 1)}>
        Next
      </button>
    </div>
  );
}
