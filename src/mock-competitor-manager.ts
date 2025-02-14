import Character from "./character";
import Cursor, { defaultCursor } from "./cursor";
import { ICompetitorManager } from "./competitor-manager.interface";
import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS, FONT_SIZE } from "./constants";

export class MockCompetitorManager implements ICompetitorManager {
    private canvasManager: CanvasManager;
    private competitors: {
        cursor: Cursor;
        currentIndex: number;
        delay: number;
        interval: number;
    }[] = [];
    private characters!: Character[];

    constructor(canvasManager: CanvasManager) {
        this.canvasManager = canvasManager;
    }

    initialize(characters: Character[]) {
        this.characters = characters;
    }

    addCompetitor() {
        if (this.competitors.length === 10) {
            return;
        }

        const newCursor = defaultCursor(
            this.canvasManager,
            FONT_SIZE,
            CURSOR_COLORS[this.competitors.length].hex
        );

        const startDelay = Math.random() * 3000;
        const charInterval = Math.random() * 250 + 50;

        this.competitors.push({
            cursor: newCursor,
            currentIndex: 0,
            delay: startDelay,
            interval: charInterval,
        });
    }

    update(deltaTime: number) {
        this.competitors.forEach((competitor) => {
            if (competitor.delay > 0) {
                competitor.delay -= deltaTime;
                return;
            }

            if (competitor.currentIndex >= this.characters.length) return;

            // Move cursor periodically based on typing speed
            if (performance.now() % competitor.interval < deltaTime) {
                const char = this.characters[competitor.currentIndex];
                competitor.cursor.move(char);
                competitor.currentIndex++;
            }
        });
    }

    draw() {
        this.competitors.forEach((competitor) => {
            competitor.cursor.draw();
        });
    }

    cleanup() {
        this.competitors = [];
    }
}
