export type PlayerInfo = {
    id: string;
    currentIdx: number;
    correctChrsCnt: number;
    wpm: number;
    playerID?: string;
    accuracy?: number;
};

export type ServerMessage =
    | { type: "state"; players: PlayerInfo[] }
    | { type: "join" | "leave"; id: string }
    | ({ type: "update" } & PlayerInfo)
    | { type: "error"; message: string }
    | { type: "assign_id"; id: string };
