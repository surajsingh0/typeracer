export type PlayerInfo = {
    id: string;
    currentIdx: number;
    correctChrsCnt: number;
    wpm: number;
};

export type ServerMessage =
    | { type: "state"; players: PlayerInfo[] }
    | { type: "join" | "leave"; id: string }
    | {
          type: "update";
          id: string;
          currentIdx: number;
          correctChrsCnt: number;
          wpm: number;
      }
    | { type: "error"; message: string };
