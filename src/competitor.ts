import Character from "./character";
import Cursor from "./cursor";
import GameState from "./game-state";
import { calculateElapsedTime, calculateWPM } from "./utils";
import { WSClient } from "./ws-client";
import { ServerMessage } from "./message";
import ICompetitor from "./competitor.interface";

export default class Competitor implements ICompetitor {
    private playerID: string;
    private id: number;
    private gameState: GameState;
    private cursor: Cursor;
    private currentIndex: number;
    private finished: boolean = false;
    private isStarted = false;
    private characters: Character[];
    private wsClient: WSClient;

    private startTime: number = 0;
    private wpm: number = 0;
    private correctChrsCnt: number = 0;

    constructor(
        wsClient: WSClient,
        playerID: string,
        id: number,
        gameState: GameState,
        cursor: Cursor,
        characters: Character[],
        currentIndex: number,
        correctChrsCnt: number
    ) {
        this.wsClient = wsClient;
        this.playerID = playerID;
        this.id = id;
        this.gameState = gameState;
        this.cursor = cursor;
        this.characters = characters;
        this.currentIndex = currentIndex;
        this.correctChrsCnt = correctChrsCnt;
        this.startTime = Date.now();

        this.gameState.competitorMetric = {
            id: id,
            wpm: 0,
        };

        this.wsClient.on("message", (message: ServerMessage) => {
            switch (message.type) {
                case "update":
                    if (message.id === this.playerID) {
                        this.currentIndex = message.currentIdx;
                        this.correctChrsCnt = message.correctChrsCnt;
                    }
                    break;
            }
        });
    }

    getID() {
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

    update(deltaTime: number) {
        if (this.finished) return;

        if (this.currentIndex >= this.characters.length) {
            this.finished = true;
            this.isStarted = false;
            return;
        }

        if (this.currentIndex === 0) this.cursor.disappear();

        if (this.currentIndex === 1 && !this.isStarted) {
            this.startTime = Date.now();
            this.isStarted = true;
        }

        if (this.currentIndex > 0) {
            const char = this.characters[this.currentIndex - 1];
            this.cursor.move(char);
        }

        this.wpm = calculateWPM(
            this.correctChrsCnt,
            calculateElapsedTime(this.startTime)
        );
        this.gameState.updateWpm(this.id, this.wpm);
    }
}
