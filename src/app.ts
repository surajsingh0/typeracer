import TypeRacer from "./type-racer";
import { createCharactersFromText } from "./character";
import Cursor from "./cursor";
import GameState from "./game-state";
import CanvasManager from "./canvas-manager";

export default class App {
    private canvasManager: CanvasManager;
    private gameState: GameState;
    private typeRacer: TypeRacer;
    private animationFrameId?: number;

    private static readonly FONT_SIZE = 30;
    private static readonly FONT_FAMILY = "monospace";
    private static readonly PADDING = 40;
    private static readonly TEXT =
        "Coding is an art, a science, and a craft. It requires creativity, logical thinking, and attention to detail. Learning to code can open up a world of possibilities, from building websites and apps to creating games and solving complex problems. The journey may be challenging at times, but the rewards are well worth the effort.";

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvasManager = new CanvasManager(canvasElement);
        this.gameState = new GameState(this.canvasManager);

        const characters = this.createCharacters();
        const cursor = this.createCursor();

        this.typeRacer = new TypeRacer(
            this.canvasManager,
            this.gameState,
            characters,
            cursor
        );
    }

    private createCharacters() {
        return createCharactersFromText(
            this.canvasManager,
            App.TEXT,
            App.FONT_SIZE,
            App.FONT_FAMILY,
            this.canvasManager.cssWidth,
            this.canvasManager.cssHeight,
            App.PADDING
        );
    }

    private createCursor() {
        return new Cursor(
            this.canvasManager,
            App.PADDING - 2,
            (this.canvasManager.cssHeight - App.FONT_SIZE * 1.2) / 2,
            "rgb(177, 177, 177)",
            App.FONT_SIZE
        );
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
