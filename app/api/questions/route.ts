import { NextRequest } from "next/server";

type Question = {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
};

// Απλές fallback ερωτήσεις για να παίζει το παιχνίδι
const fallbackQuestions: Question[] = [
  {
    question: "What is the capital of France?",
    correct_answer: "Paris",
    incorrect_answers: ["London", "Berlin", "Madrid"],
  },
  {
    question: "Which planet is known as the Red Planet?",
    correct_answer: "Mars",
    incorrect_answers: ["Jupiter", "Venus", "Saturn"],
  },
  {
    question: "Who wrote 'Romeo and Juliet'?",
    correct_answer: "William Shakespeare",
    incorrect_answers: ["Charles Dickens", "Mark Twain", "Leo Tolstoy"],
  },
];

let cache: Question[] | null = null;
let lastCacheTime = 0;
const CACHE_TIME = 1000 * 30; // 30s

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, difficulty } = body;

    if (!category)
      return Response.json({ ok: false, error: "Missing category" });

    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // 1. Πάρε token
    const tokenRes = await fetch(`${base}/api/token`);
    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      // token δεν ήρθε → αν υπάρχει cache, δώστο, αλλιώς fallback
      if (cache) {
        return Response.json({ ok: true, cached: true, data: cache });
      }
      return Response.json({
        ok: true,
        cached: false,
        data: fallbackQuestions,
        info: "Token error, using fallback questions",
      });
    }

    const token = tokenData.token;

    // 2. OpenTDB URL
    let apiUrl = `https://opentdb.com/api.php?amount=10&category=${category}&type=multiple&token=${token}`;
    if (difficulty) apiUrl += `&difficulty=${difficulty}`;

    // 3. Αν έχουμε cache πρόσφατο → δώσε το
    const now = Date.now();
    if (cache && now - lastCacheTime < CACHE_TIME) {
      return Response.json({ ok: true, cached: true, data: cache });
    }

    // 4. Κλήση στο OpenTDB
    const res = await fetch(apiUrl, { cache: "no-store" });
    const data = await res.json();

    // token invalid / reset
    if (data.response_code === 3 || data.response_code === 4) {
      await fetch(
        `https://opentdb.com/api_token.php?command=reset&token=${token}`
      );

      // αν έχουμε cache → reuse
      if (cache) {
        return Response.json({
          ok: true,
          cached: true,
          data: cache,
          info: "Token reset, using cached questions",
        });
      }

      return Response.json({
        ok: true,
        cached: false,
        data: fallbackQuestions,
        info: "Token reset, using fallback questions",
      });
    }

    // response_code 0 → όλα καλά → χρησιμοποιούμε results
    if (data.response_code === 0 && Array.isArray(data.results)) {
      cache = data.results;
      lastCacheTime = now;
      return Response.json({
        ok: true,
        cached: false,
        data: data.results,
        info: "Questions from OpenTDB",
      });
    }

    // response_code 5 (rate limit) ή οτιδήποτε άλλο → fallback
    if (cache) {
      return Response.json({
        ok: true,
        cached: true,
        data: cache,
        info: "OpenTDB error, using cached questions",
        apiResponse: data,
      });
    }

    return Response.json({
      ok: true,
      cached: false,
      data: fallbackQuestions,
      info: "OpenTDB error, using fallback questions",
      apiResponse: data,
    });
  } catch (err) {
    // Σε περίπτωση πλήρους αποτυχίας → fallback ή cache
    if (cache) {
      return Response.json({
        ok: true,
        cached: true,
        data: cache,
        info: "Exception, using cached questions",
        error: String(err),
      });
    }

    return Response.json({
      ok: true,
      cached: false,
      data: fallbackQuestions,
      info: "Exception, using fallback questions",
      error: String(err),
    });
  }
}
