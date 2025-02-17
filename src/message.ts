type PlayerInfo = {
    id: string;
    currentIdx: number;
};

export type ServerMessage =
    | { type: "state"; players: PlayerInfo[] }
    | { type: "join" | "leave"; id: string }
    | { type: "update"; id: string; currentIdx: number }
    | { type: "error"; message: string };
