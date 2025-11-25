type Room = {
  players: number;
};

export const rooms = new Map<string, Room>();
export const rooms = new Map<string, { players: number }>();
