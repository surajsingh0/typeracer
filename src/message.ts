export type PlayerInfo = {
    id: string;
    currentIdx: number;
    correctChrsCnt: number;
};

export type ServerMessage =
    | { type: "state"; players: PlayerInfo[] }
    | { type: "join" | "leave"; id: string }
    | { type: "update"; id: string; currentIdx: number; correctChrsCnt: number }
    | { type: "error"; message: string };
