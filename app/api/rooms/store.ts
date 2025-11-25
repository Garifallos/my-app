// app/api/rooms/store.ts

export type RoomData = {
  players: number; // πόσοι GUESTS έχουν μπει (0–1)
  started: boolean;
  scores: {
    host?: number;
    guest?: number;
  };
};

export const rooms = new Map<string, RoomData>();

// ---------------------------
// REMOVE GUEST (leave)
// ---------------------------
export function leaveRoom(code: string) {
  const room = rooms.get(code);
  if (!room) return;

  if (room.players > 0) {
    room.players -= 1;
  }

  // Αν δεν υπάρχει κανένας πια → delete room
  if (room.players === 0 && !room.started) {
    rooms.delete(code);
    return;
  }

  rooms.set(code, room);
}

// ---------------------------
// DELETE ROOM (end of quiz)
// ---------------------------
export function deleteRoom(code: string) {
  rooms.delete(code);
}
