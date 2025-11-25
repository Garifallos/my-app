"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");

  // Φόρτωση theme από localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme");
    const initial = (saved as "light" | "dark") || "light";
    setTheme(initial);
    document.body.classList.toggle("dark", initial === "dark");
  }, []);

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);
    }
    document.body.classList.toggle("dark", newTheme === "dark");
  }

  // Φόρτωση κατηγοριών από OpenTDB
  useEffect(() => {
    async function loadCats() {
      try {
        const res = await fetch("https://opentdb.com/api_category.php");
        const data = await res.json();
        setCategories(data.trivia_categories || []);
      } catch (e) {
        console.error("Failed to load categories", e);
      }
    }
    loadCats();
  }, []);

  // 1-player start
  function startQuiz() {
    if (!selectedCategory) return;

    const params = new URLSearchParams();
    if (difficulty) params.set("difficulty", difficulty);

    const query = params.toString();
    router.push(`/quiz/${selectedCategory}${query ? `?${query}` : ""}`);
  }

  // 2-player mode
  function goToTwoPlayer() {
    router.push("/2player");
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

      {/* 2 Player Mode button */}
      <button
        className="next-btn"
        style={{ marginBottom: 20, marginTop: 10 }}
        onClick={goToTwoPlayer}
      >
        2 Player Mode
      </button>

      {/* Difficulty */}
      <h2>Difficulty</h2>
      <select
        className="select-glass"
        value={difficulty}
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
        value={selectedCategory}
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
        style={{ marginTop: 20 }}
        onClick={startQuiz}
      >
        Start Quiz
      </button>
    </div>
  );
}
