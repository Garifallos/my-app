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

// ΝΕΟ: remove guest or reset room
export function leaveRoom(code: string) {
  const room = rooms.get(code);

  if (!room) return;

  // Αν υπάρχει guest → τον βγάζουμε
  if (room.players > 0) {
    room.players -= 1;
  }

  // Αν δεν υπάρχει πλέον κανείς → σβήσε το room
  if (room.players === 0 && !room.started) {
    rooms.delete(code);
    return;
  }

  rooms.set(code, room);
}
