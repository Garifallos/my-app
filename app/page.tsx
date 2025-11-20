"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  // State
  const [theme, setTheme] = useState("light");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState("");

  // LOAD THEME (από localStorage)
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

  // LOAD OPEN TRIVIA CATEGORIES
  useEffect(() => {
    async function loadCats() {
      const res = await fetch("https://opentdb.com/api_category.php");
      const data = await res.json();
      setCategories(data.trivia_categories); // [ {id,name}, ... ]
    }
    loadCats();
  }, []);

  // Start quiz → dynamic route
  function startQuiz() {
    if (!selectedCategory) return;

    const cat = selectedCategory;
    const diff = difficulty ? `?difficulty=${difficulty}` : "";

    router.push(`/quiz/${cat}${diff}`);
  }

  return (
    <div className="quiz-container">

      {/* Theme Switch */}
      <div
        className={`theme-switch ${theme === "dark" ? "dark" : ""}`}
        onClick={toggleTheme}
      >
        <span className="switch-icon sun">☀️</span>
        <span className="switch-icon moon">🌙</span>
        <div className="switch-circle"></div>
      </div>

      <h1>Start Your Quiz</h1>

      {/* Difficulty */}
      <h2>Difficulty</h2>
      <select
        className="select-glass"
        onChange={(e) => setDifficulty(e.target.value)}
      >
        <option value="">Choose difficulty...</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      {/* Category */}
      <h2>Select Category</h2>
      <select
        className="select-glass"
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="">Choose...</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Start button */}
      <button
        disabled={!selectedCategory}
        className="next-btn"
        onClick={startQuiz}
      >
        Start Quiz
      </button>

    </div>
  );
}
