import Character from "./character";
// import ICompetitor from "./competitor.interface";
import Cursor from "./cursor";
import GameState from "./game-state";
import { calculateElapsedTime, calculateWPM, calculateAccuracy } from "./utils";

// TODO: fix
export default class MockCompetitor /*implements ICompetitor*/ {
    private playerID: string;
    private id: number;
    private gameState: GameState;
    private cursor: Cursor;
    private currentIndex: number;
    private correctChrsCnt: number;
    private delay: number;
    private interval: number;
    private finished: boolean = false;
    private characters: Character[];

    private startTime: number = 0;
    private wpm: number = 0;

    constructor(
        playerID: string,
        id: number,
        gameState: GameState,
        cursor: Cursor,
        characters: Character[],
        currentIndex: number,
        correctChrsCnt: number,
        delay: number,
        interval: number
    ) {
        this.playerID = playerID;
        this.id = id;
        this.gameState = gameState;
        this.cursor = cursor;
        this.characters = characters;
        this.currentIndex = currentIndex;
        this.correctChrsCnt = correctChrsCnt;
        this.delay = delay;
        this.interval = interval;

        this.startTime = Date.now();
        // TODO: fix
        // this.gameState.competitorMetric = {
        //     id: this.id,
        //     wpm: 0,
        //     accuracy: 0,
        // };
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

        if (this.delay > 0) {
            this.delay -= deltaTime;
            return;
        }

        if (this.currentIndex >= this.characters.length) {
            this.finished = true;
            return;
        }

        // Move cursor periodically based on typing speed
        if (performance.now() % this.interval < deltaTime) {
            const char = this.characters[this.currentIndex];
            this.cursor.move(char);
            this.currentIndex++;

            this.wpm = calculateWPM(
                this.currentIndex,
                calculateElapsedTime(this.startTime)
            );
            this.gameState.updateWpm(this.id.toString(), this.wpm);
            const accuracy = calculateAccuracy(
                this.correctChrsCnt,
                this.currentIndex
            );
            this.gameState.updateAccuracy(this.id.toString(), accuracy);
        }
    }
}
