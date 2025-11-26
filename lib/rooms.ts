// lib/rooms.ts
export type RoomData = {
  players: number; // πόσοι guests έχουν μπει (0 ή 1)
  scores?: {
    host?: number;
    guest?: number;
  };
};

export const rooms = new Map<string, RoomData>();
