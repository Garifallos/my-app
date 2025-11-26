// Temporary in-memory storage for quiz rooms 
// ⚠ Αυτό ΧΑΝΕΤΑΙ όταν γίνει restart το server (Vercel function reset)

type RoomData = {
  players?: number; // πόσοι παίκτες έχουν JOIN
  scores?: {
    host?: number;
    guest?: number;
  };
};

export const rooms = new Map<string, RoomData>();
