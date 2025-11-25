let cachedToken: string | null = null;
let lastTokenFetch = 0;
const TOKEN_TTL = 1000 * 60 * 60; // 1 hour lifetime

export async function GET() {
  const now = Date.now();

  // reuse token if valid
  if (cachedToken && now - lastTokenFetch < TOKEN_TTL) {
    return Response.json({ ok: true, token: cachedToken, cached: true });
  }

  // request new token
  const res = await fetch(
    "https://opentdb.com/api_token.php?command=request"
  );
  const data = await res.json();

  if (data.response_code !== 0) {
    return Response.json({
      ok: false,
      error: "Failed to fetch token",
      apiResponse: data,
    });
  }

  cachedToken = data.token;
  lastTokenFetch = now;

  return Response.json({ ok: true, token: cachedToken, cached: false });
}
