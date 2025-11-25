// app/api/rooms/store.ts

export type RoomData = {
  players: number;
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

  // Αν δεν υπάρχει πια κανείς και δεν έχει ξεκινήσει → delete
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
