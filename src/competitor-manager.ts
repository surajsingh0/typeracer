import Character from "./character";
import { defaultCursor } from "./cursor";
import ICompetitorManager from "./competitor-manager.interface";
import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS, FONT_SIZE } from "./constants";
import ICompetitor from "./competitor.interface";
import GameState from "./game-state";
import Competitor from "./competitor";
import { WSClient } from "./ws-client";
import { ServerMessage } from "./message";

export class CompetitorManager implements ICompetitorManager {
    private canvasManager: CanvasManager;
    private gameState!: GameState;
    private competitors: ICompetitor[] = [];
    private characters!: Character[];
    private wsClient: WSClient;

    constructor(canvasManager: CanvasManager, wsClient: WSClient) {
        this.canvasManager = canvasManager;
        this.wsClient = wsClient;

        this.wsClient.on("message", (message: ServerMessage) => {
            switch (message.type) {
                case "join":
                    this.addCompetitor(message.id, null);
                    break;
                case "leave":
                    this.removeCompetitor(message.id);
                    break;
            }
        });
    }

    initialize(gameState: GameState, characters: Character[]) {
        this.gameState = gameState;
        this.characters = characters;
    }

    addCompetitor(playerID: string | null, currentIdx: number | null) {
        if (this.competitors.length === 10) {
            return;
        }

        const newCursor = defaultCursor(
            this.canvasManager,
            FONT_SIZE,
            CURSOR_COLORS[this.competitors.length].hex
        );

        const competitor = new Competitor(
            this.wsClient,
            playerID ?? "",
            this.competitors.length,
            this.gameState,
            newCursor,
            this.characters,
            currentIdx ?? 0
        );
        this.competitors.push(competitor);
    }

    private removeCompetitor(playerID: string) {
        if (!playerID) {
            console.warn("Attempted to remove competitor with empty ID");
            return;
        }

        const index = this.competitors.findIndex(
            (competitor) => competitor.getPlayerID() === playerID
        );

        if (index !== -1) {
            console.log(`Removing competitor with ID: ${playerID}`);
            this.gameState.removeCompetitorMetric(
                this.competitors[index].getID()
            );
            this.competitors.splice(index, 1);
        } else {
            console.warn(
                `Couldn't find competitor with ID: ${playerID} to remove`
            );
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
