import TypeRacer from "./type-racer";
import { createCharactersFromText } from "./character";
import { defaultCursor } from "./cursor";
import GameState from "./game-state";
import CanvasManager from "./canvas-manager";
import { FONT_FAMILY, FONT_SIZE, PADDING, TEXT } from "./constants";
import { WSClient } from "./ws-client";
import { CompetitorManager } from "./competitor-manager";
import { PlayerInfo, ServerMessage } from "./message";

export default class App {
    private canvasManager: CanvasManager;
    private gameState?: GameState;
    private typeRacer?: TypeRacer;
    private animationFrameId?: number;
    private wsClient?: WSClient;

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvasManager = new CanvasManager(canvasElement);

        this.initialize();
    }

    private async initialize() {
        const params = new URLSearchParams(window.location.search);
        let roomID = params.get("room");

        const paragraphData: { paragraph: string | null; idx: number | null } =
            { paragraph: null, idx: null };

        let isRoom = params.has("room");
        if (isRoom) {
            const room = params.get("room") as string;
            const parts = room?.split("_");
            if (parts?.length >= 3) {
                const pIdxPart = parts[parts?.length - 1];
                paragraphData.idx = parseInt(pIdxPart);

                const data = await this.getParagraph(paragraphData.idx);
                if (!data) isRoom = false;
                paragraphData.paragraph = data?.paragraph;
                paragraphData.idx = data?.index as number | null;
            } else {
                isRoom = false;
            }
        }
        if (!isRoom) {
            const data = await this.getParagraph(null);
            paragraphData.idx = data?.index as number | null;
            paragraphData.paragraph = data?.paragraph;
            roomID =
                "room_" +
                Math.random().toString(36).slice(2, 11) +
                "_" +
                data?.index;
        }

        const url = new URL(window.location.href);
        url.searchParams.set("room", roomID as string);
        window.history.pushState({}, "", url.toString());

        this.gameState = new GameState(this.canvasManager, roomID!);
        this.wsClient = new WSClient({
            url: `ws://localhost:8080/ws?room=${encodeURIComponent(roomID!)}`,
        });
        this.wsClient.connect();

        const playerID = "player_" + Math.random().toString(36).slice(2, 11);

        this.wsClient.on("open", () => {
            console.log("Connected to server");
            this.wsClient?.send({
                id: playerID,
                currentIdx: 0,
                correctChrsCnt: 0,
            } as PlayerInfo);
        });

        const characters = this.createCharacters(
            paragraphData.paragraph || TEXT
        );
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
                    message.players?.forEach((player) => {
                        this.typeRacer?.addCompetitor(
                            player.id,
                            player.currentIdx,
                            player.correctChrsCnt
                        );
                    });
            }
        });
    }

    private createCharacters(text: string) {
        return createCharactersFromText(
            this.canvasManager,
            text,
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

        this.typeRacer?.update();
        this.typeRacer?.draw();
        this.gameState?.draw();

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };

    private getParagraph = async (index: number | null) => {
        try {
            const response = await fetch("paragraphs.json");
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `HTTP error! status: ${response.status}, message: ${errorText}`
                );
            }

            const res = await response.json();
            const paragraphs = res.data;

            if (index === null) {
                const randomIndex = Math.floor(
                    Math.random() * paragraphs.length
                );
                return {
                    paragraph: paragraphs[randomIndex].paragraph,
                    index: randomIndex,
                };
            } else if (index >= 0 && index < paragraphs.length) {
                return { paragraph: paragraphs[index].paragraph, index: index };
            } else {
                console.error("Invalid index:", index);
                return null;
            }
        } catch (error) {
            console.error("Error fetching/parsing JSON:", error);
            return null;
        }
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
        this.wsClient?.disconnect();
    }
}
