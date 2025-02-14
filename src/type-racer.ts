import CanvasManager from "./canvas-manager";
import Character from "./character";
import Cursor from "./cursor";
import GameState from "./game-state";
import { calculateWPM, calculateElapsedTime } from "./utils";

export default class TypeRacer {
    private canvasManager: CanvasManager;
    private gameState: GameState;
    private characters: Character[];
    private curCharIdx: number;
    private cursor: Cursor;

    private correctWordsCnt: number = 0;
    private startTime: number;
    private wpm: number;

    constructor(
        canvasManager: CanvasManager,
        gameState: GameState,
        characters: Character[],
        cursor: Cursor
    ) {
        this.canvasManager = canvasManager;
        this.gameState = gameState;
        this.characters = characters;
        this.curCharIdx = 0;
        this.cursor = cursor;
        cursor.disappear();

        this.startTime = Date.now();
        this.wpm = 0;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener("keydown", this.handleKeyDown);
    }

    private handleKeyDown(event: KeyboardEvent) {
        if (
            (event.key.length > 1 && event.key !== "Backspace") ||
            this.gameState.isOver
        ) {
            return;
        }

        const typedChar = event.key;
        const curChar = this.characters[this.curCharIdx];

        if (this.curCharIdx === 0) {
            this.startTime = Date.now();
        }

        if (typedChar === "Backspace") {
            if (this.curCharIdx === 0) {
                return;
            }
            this.curCharIdx--;
            this.characters[this.curCharIdx].currentState = "neutral";
            if (this.curCharIdx === 0) {
                this.cursor.disappear();
            } else {
                this.cursor.move(this.characters[this.curCharIdx - 1]);
            }
        } else {
            const isCorrect = typedChar === curChar.char;
            this.correctWordsCnt += isCorrect ? 1 : 0;
            curChar.currentState = isCorrect ? "correct" : "incorrect";
            this.curCharIdx++;
            this.cursor.move(curChar);

            if (this.curCharIdx === this.characters.length) {
                this.end();
                return;
            }
        }
    }

    draw() {
        const { ctx } = this.canvasManager;

        this.characters.forEach((char) => {
            char.draw();
        });
        this.cursor.draw();

        this.wpm = !this.gameState.isOver
            ? calculateWPM(
                  this.correctWordsCnt,
                  calculateElapsedTime(this.startTime)
              )
            : this.wpm;
        ctx.fillStyle = "rgb(152, 152, 152)";
        ctx.fillText(`WPM: ${this.wpm}`, 40, 50, 100);
    }

    update() {}

    private end() {
        this.gameState.isOver = true;
        this.gameState.metrics = { wpm: this.wpm };
        this.cleanup();
    }

    private cleanup() {
        document.removeEventListener("keypress", this.handleKeyDown);
    }
}
