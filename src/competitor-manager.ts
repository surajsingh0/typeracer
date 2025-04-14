import Character from "./character";
import { defaultCursor } from "./cursor";
import ICompetitorManager from "./competitor-manager.interface";
import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS, FONT_SIZE } from "./constants";
import ICompetitor from "./competitor.interface";
import GameState from "./game-state";
import Competitor from "./competitor";
import { WSClient } from "./ws-client";

export class CompetitorManager implements ICompetitorManager {
    private canvasManager: CanvasManager;
    private gameState!: GameState;
    private competitors: ICompetitor[] = [];
    private characters!: Character[];
    private wsClient: WSClient;

    constructor(canvasManager: CanvasManager, wsClient: WSClient) {
        this.canvasManager = canvasManager;
        this.wsClient = wsClient;
    }

    initialize(gameState: GameState, characters: Character[]) {
        this.gameState = gameState;
        this.characters = characters;
    }

    addCompetitor(id: string, displayID?: string): void {
        if (!this.gameState || !this.characters) {
            console.error("CompetitorManager not initialized!");
            return;
        }

        const uniqueID = id;
        const competitorDisplayID = displayID || uniqueID;

        if (this.competitors.some((c) => c.getID() === uniqueID)) {
            return;
        }

        const colorIndex = this.competitors.length % CURSOR_COLORS.length;
        const competitorCursor = defaultCursor(
            this.canvasManager,
            FONT_SIZE,
            CURSOR_COLORS[colorIndex].hex
        );

        const competitor = new Competitor(
            this.wsClient,
            competitorDisplayID,
            uniqueID,
            this.gameState,
            competitorCursor,
            this.characters,
            0,
            0,
            0
        );
        this.competitors.push(competitor);
        console.log(
            `CompetitorManager added competitor instance: ${competitorDisplayID} (ID: ${uniqueID})`
        );
    }

    removeCompetitor(id: string): void {
        const index = this.competitors.findIndex((c) => c.getID() === id);
        if (index !== -1) {
            console.log(`CompetitorManager removing instance with ID: ${id}`);
            this.competitors.splice(index, 1);
        }
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
