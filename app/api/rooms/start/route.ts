async function startGame() {
  const category = "9";

  const hostUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=1`;
  const guestUrl = `/quiz/${category}?multiplayer=1&room=${code}&host=0`;

  // ΣΤΕΛΝΟΥΜΕ στους Guests το ΣΩΣΤΟ URL
  await fetch("/api/rooms/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room: code,
      url: guestUrl,  // ⬅⬅⬅ οι guests πάνε ΠΑΝΤΑ στο guestUrl
    }),
  });

  // Ο HOST πάει στο hostUrl
  router.push(hostUrl);
}
