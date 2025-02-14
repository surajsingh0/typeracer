import Character from "./character";
import Cursor from "./cursor";
import GameState from "./game-state";
import { calculateElapsedTime, calculateWPM } from "./utils";

export default class MockCompetitor {
    private id: number;
    private gameState: GameState;
    private cursor: Cursor;
    private currentIndex: number;
    private delay: number;
    private interval: number;
    private finished: boolean = false;
    private characters: Character[];

    private startTime: number = 0;
    private wpm: number = 0;

    constructor(
        id: number,
        gameState: GameState,
        cursor: Cursor,
        characters: Character[],
        currentIndex: number,
        delay: number,
        interval: number
    ) {
        this.id = id;
        this.gameState = gameState;
        this.cursor = cursor;
        this.characters = characters;
        this.currentIndex = currentIndex;
        this.delay = delay;
        this.interval = interval;

        this.startTime = Date.now();
        this.gameState.competitorMetric = {
            id: this.id,
            wpm: 0,
        };
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
            this.gameState.updateWpm(this.id, this.wpm);
        }
    }
}
