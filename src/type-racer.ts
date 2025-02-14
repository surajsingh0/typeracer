import CanvasManager from "./canvas-manager";
import Character from "./character";
import Cursor from "./cursor";
import GameState from "./game-state";
import { calculateWPM, calculateElapsedTime } from "./utils";
import { ICompetitorManager } from "./competitor-manager.interface";

export default class TypeRacer {
    private canvasManager: CanvasManager;
    private gameState: GameState;
    private characters: Character[];
    private curCharIdx: number;
    private myCursor: Cursor;

    private correctWordsCnt: number = 0;
    private startTime: number;
    private wpm: number;

    private lastUpdateTimestamp: number = performance.now();
    private competitorManager: ICompetitorManager;

    constructor(
        canvasManager: CanvasManager,
        gameState: GameState,
        characters: Character[],
        myCursor: Cursor,
        competitorManager: ICompetitorManager
    ) {
        this.canvasManager = canvasManager;
        this.gameState = gameState;
        this.characters = characters;
        this.curCharIdx = 0;
        this.myCursor = myCursor;
        myCursor.disappear();

        this.startTime = Date.now();
        this.wpm = 0;

        this.competitorManager = competitorManager;
        this.competitorManager.initialize(characters);

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
                this.myCursor.disappear();
            } else {
                this.myCursor.move(this.characters[this.curCharIdx - 1]);
            }
        } else {
            const isCorrect = typedChar === curChar.char;
            this.correctWordsCnt += isCorrect ? 1 : 0;
            curChar.currentState = isCorrect ? "correct" : "incorrect";
            this.curCharIdx++;
            this.myCursor.move(curChar);

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
        this.myCursor.draw();
        this.competitorManager.draw();

        this.wpm = !this.gameState.isOver
            ? calculateWPM(
                  this.correctWordsCnt,
                  calculateElapsedTime(this.startTime)
              )
            : this.wpm;
        ctx.fillStyle = "rgb(152, 152, 152)";
        ctx.fillText(`WPM: ${this.wpm}`, 40, 50, 100);
    }

    addCompetitor() {
        this.competitorManager.addCompetitor();
    }

    update() {
        if (this.gameState.isOver) {
            return;
        }

        const now = performance.now();
        const deltaTime = now - this.lastUpdateTimestamp;
        this.lastUpdateTimestamp = now;

        this.competitorManager.update(deltaTime);
    }

    private end() {
        this.gameState.isOver = true;
        this.gameState.metrics = { wpm: this.wpm };
        this.cleanup();
    }

    private cleanup() {
        document.removeEventListener("keypress", this.handleKeyDown);
    }
}
