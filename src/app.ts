import TypeRacer from "./type-racer";
import { createCharactersFromText } from "./character";
import { defaultCursor } from "./cursor";
import GameState from "./game-state";
import CanvasManager from "./canvas-manager";
import { FONT_FAMILY, FONT_SIZE, PADDING, TEXT } from "./constants";
import { MockCompetitorManager } from "./mock-competitor-manager";

export default class App {
    private canvasManager: CanvasManager;
    private gameState: GameState;
    private typeRacer: TypeRacer;
    private animationFrameId?: number;

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvasManager = new CanvasManager(canvasElement);
        this.gameState = new GameState(this.canvasManager);

        const characters = this.createCharacters();
        const cursor = this.createCursor();

        this.typeRacer = new TypeRacer(
            this.canvasManager,
            this.gameState,
            characters,
            cursor,
            new MockCompetitorManager(this.canvasManager)
        );

        for (let i = 0; i < 10; i++) {
            this.typeRacer.addCompetitor(); // mock
        }
    }

    private createCharacters() {
        return createCharactersFromText(
            this.canvasManager,
            TEXT,
            FONT_SIZE,
            FONT_FAMILY,
            this.canvasManager.cssWidth,
            this.canvasManager.cssHeight,
            PADDING
        );
    }

    private createCursor() {
        return defaultCursor(this.canvasManager, FONT_SIZE);
    }

    private gameLoop = () => {
        const { ctx } = this.canvasManager;
        const { width, height } = this.canvasManager.canvas;

        ctx.clearRect(0, 0, width, height);

        this.typeRacer.update();
        this.typeRacer.draw();
        this.gameState.draw();

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };

    start() {
        this.gameLoop();
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    destroy() {
        this.stop();
    }
}
