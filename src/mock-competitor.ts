import Character from "./character";
import Cursor from "./cursor";

export default class MockCompetitor {
    private cursor: Cursor;
    private currentIndex: number;
    private delay: number;
    private interval: number;
    private finished: boolean = false;
    private characters: Character[];

    constructor(
        cursor: Cursor,
        characters: Character[],
        currentIndex: number,
        delay: number,
        interval: number
    ) {
        this.cursor = cursor;
        this.characters = characters;
        this.currentIndex = currentIndex;
        this.delay = delay;
        this.interval = interval;
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
        }
    }
}
