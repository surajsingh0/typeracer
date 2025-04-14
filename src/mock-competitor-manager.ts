import Character from "./character";
import { defaultCursor } from "./cursor";
// import ICompetitorManager from "./competitor-manager.interface";
import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS, FONT_SIZE } from "./constants";
import MockCompetitor from "./mock-competitor";
// import ICompetitor from "./competitor.interface";
import GameState from "./game-state";

// TODO: fix
export class MockCompetitorManager /*implements ICompetitorManager*/ {
    private canvasManager: CanvasManager;
    private gameState!: GameState;
    // private competitors: ICompetitor[] = [];
    private competitors: MockCompetitor[] = [];
    private characters!: Character[];

    constructor(canvasManager: CanvasManager) {
        this.canvasManager = canvasManager;
    }

    initialize(gameState: GameState, characters: Character[]) {
        this.gameState = gameState;
        this.characters = characters;
    }

    addCompetitor(
        playerID: string | null,
        currentIdx: number | null,
        correctChrsCnt: number | null
    ) {
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

        const competitor = new MockCompetitor(
            playerID ?? "",
            this.competitors.length,
            this.gameState,
            newCursor,
            this.characters,
            currentIdx ?? 0,
            correctChrsCnt ?? 0,
            startDelay,
            charInterval
        );
        this.competitors.push(competitor);
    }

    anyFinished() {
        return this.competitors.some((competitor) => competitor.isFinished());
    }

    update(deltaTime: number) {
        this.competitors.forEach((competitor) => {
            competitor.update(deltaTime);
        });
    }

    draw() {
        this.competitors.forEach((competitor) => {
            competitor.draw();
        });
    }

    cleanup() {
        this.competitors = [];
    }
}
