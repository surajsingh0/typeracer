import Character from "./character";
import Cursor from "./cursor";
import GameState from "./game-state";
import { calculateAccuracy } from "./utils";
import { WSClient } from "./ws-client";
import { ServerMessage } from "./message";
import ICompetitor from "./competitor.interface";
import TypeRacerMetrics from "./metrics";

export default class Competitor implements ICompetitor {
    private playerID: string;
    private id: string;
    private gameState: GameState;
    private cursor: Cursor;
    private currentIndex: number;
    private finished = false;
    private characters: Character[];
    private wsClient: WSClient;

    private wpm = 0;
    private accuracy = 0;
    private correctChrsCnt = 0;

    constructor(
        wsClient: WSClient,
        playerID: string,
        id: string,
        gameState: GameState,
        cursor: Cursor,
        characters: Character[],
        currentIndex: number,
        correctChrsCnt: number,
        wpm: number
    ) {
        this.wsClient = wsClient;
        this.playerID = playerID;
        this.id = id;
        this.gameState = gameState;
        this.cursor = cursor;
        this.characters = characters;
        this.currentIndex = currentIndex;
        this.correctChrsCnt = correctChrsCnt;
        this.wpm = wpm;

        const initialMetrics: TypeRacerMetrics = {
            id: this.id,
            playerID: this.playerID,
            wpm: this.wpm,
            accuracy: this.accuracy,
        };
        this.gameState.updateCompetitorMetric(initialMetrics);

        this.wsClient.on("message", (message: ServerMessage) => {
            switch (message.type) {
                case "update":
                    if (message.id === this.id) {
                        this.currentIndex = message.currentIdx;
                        this.correctChrsCnt = message.correctChrsCnt;
                        this.wpm = message.wpm;
                        if (message.accuracy !== undefined) {
                            this.accuracy = message.accuracy;
                        }
                    }
                    break;
            }
        });
    }

    getID(): string {
        return this.id;
    }

    getPlayerID() {
        return this.playerID;
    }

    setPlayerID(id: string) {
        this.playerID = id;
    }

    setCurrentIdx(idx: number) {
        this.currentIndex = idx;
    }

    isFinished() {
        return this.finished;
    }

    draw() {
        this.cursor.draw();
    }

    // @ts-ignore
    update(deltaTime: number) {
        if (this.finished) return;

        if (this.currentIndex === 0) this.cursor.disappear();

        if (this.currentIndex > 0) {
            const char = this.characters[this.currentIndex - 1];
            this.cursor.move(char);
        }

        this.accuracy = calculateAccuracy(
            this.correctChrsCnt,
            this.currentIndex
        );
        this.gameState.updateWpm(this.id, this.wpm);
        this.gameState.updateAccuracy(this.id, this.accuracy);

        if (this.currentIndex >= this.characters.length) {
            this.finished = true;
        }
    }
}
