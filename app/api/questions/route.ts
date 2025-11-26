import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { category, difficulty } = await req.json();

    // Φτιάχνουμε σωστό OpenTDB URL
    let url = `https://opentdb.com/api.php?amount=5&type=multiple`;

    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;

    // Fetch από OpenTDB με no-store για Vercel
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      console.log("OpenTDB returned non-200");
      return Response.json({ ok: false, fallback: true });
    }

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      console.log("OpenTDB returned empty results");
      return Response.json({ ok: false, fallback: true });
    }

    return Response.json({
      ok: true,
      data: data.results,
    });
  } catch (err) {
    console.error("Questions API error:", err);
    return Response.json({ ok: false, fallback: true });
  }
}
