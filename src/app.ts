import TypeRacer from "./type-racer";
import { createCharactersFromText } from "./character";
import { defaultCursor } from "./cursor";
import GameState from "./game-state";
import CanvasManager from "./canvas-manager";
import { FONT_FAMILY, FONT_SIZE, PADDING, TEXT } from "./constants";
import { WSClient } from "./ws-client";
import { CompetitorManager } from "./competitor-manager";
import { ServerMessage } from "./message";

export default class App {
    private canvasManager: CanvasManager;
    private gameState: GameState;
    private typeRacer: TypeRacer;
    private animationFrameId?: number;
    private wsClient: WSClient;

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvasManager = new CanvasManager(canvasElement);
        this.gameState = new GameState(this.canvasManager);
        this.wsClient = new WSClient({
            url: "ws://localhost:8080/ws?room=room123",
        });
        this.wsClient.connect();

        const playerID = "player_" + Math.random().toString(36).substr(2, 9);

        this.wsClient.on("open", () => {
            console.log("Connected to server");
            this.wsClient.send({
                id: playerID,
                currentIdx: 0,
            });
        });

        const characters = this.createCharacters();
        const cursor = this.createCursor();

        this.typeRacer = new TypeRacer(
            this.canvasManager,
            this.gameState,
            characters,
            cursor,
            new CompetitorManager(this.canvasManager, this.wsClient),
            playerID,
            this.wsClient
        );

        this.wsClient.on("message", (message: ServerMessage) => {
            switch (message.type) {
                case "state":
                    message.players.forEach((player) => {
                        this.typeRacer.addCompetitor(
                            player.id,
                            player.currentIdx
                        );
                    });
            }
        });
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
