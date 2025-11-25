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
