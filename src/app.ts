import TypeRacer from "./type-racer";
import { createCharactersFromText } from "./character";
import { defaultCursor } from "./cursor";
import GameState from "./game-state";
import CanvasManager from "./canvas-manager";
import { FONT_FAMILY, FONT_SIZE, TEXT } from "./constants";
import { WSClient } from "./ws-client";
import { CompetitorManager } from "./competitor-manager";
import { PlayerInfo } from "./message";
import { generateUsername } from "./utils";
import Character from "./character";
import Cursor from "./cursor";

function calculateFontSize(
    canvasMgr: CanvasManager,
    minSize = 12,
    maxSize = 32,
    targetCharsPerLine = 60
): number {
    const targetWidth = canvasMgr.cssWidth * 0.8;
    let calculatedSize = targetWidth / targetCharsPerLine / 0.6;
    return Math.max(minSize, Math.min(maxSize, Math.round(calculatedSize)));
}

export default class App {
    private canvasManager: CanvasManager;
    private gameState?: GameState;
    private typeRacer?: TypeRacer;
    private animationFrameId?: number;
    private wsClient?: WSClient;
    private currentFontSize: number = FONT_SIZE;
    private currentText: string = "";

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
            if (parts?.length >= 2) {
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
                Math.random().toString(36).slice(2, 11) + "_" + data?.index;
        }

        // Store fetched text
        this.currentText = paragraphData.paragraph || TEXT;

        const url = new URL(window.location.href);
        url.searchParams.set("room", roomID as string);
        window.history.pushState({}, "", url.toString());

        this.gameState = new GameState(this.canvasManager, roomID!);
        this.wsClient = new WSClient({
            url: `ws://localhost:8080/ws?room=${encodeURIComponent(roomID!)}`,
        });
        this.wsClient.connect();

        const playerID = generateUsername();

        this.wsClient.on("open", () => {
            console.log(`Connected to server. Player Display ID: ${playerID}`);
            this.wsClient?.send({
                id: playerID,
                type: "update",
                currentIdx: 0,
                correctChrsCnt: 0,
                wpm: 0,
                playerID: playerID,
            } as PlayerInfo);
        });

        this.currentFontSize = calculateFontSize(this.canvasManager);
        const characters = this.createCharacters(this.currentText);
        const cursor = this.createCursor();

        this.typeRacer = new TypeRacer(
            this.canvasManager,
            this.gameState,
            characters,
            cursor,
            new CompetitorManager(this.canvasManager, this.wsClient),
            this.wsClient,
            playerID
        );

        this.canvasManager.setResizeCallback(() => {
            console.log("Resize detected, recalculating layout...");
            this.currentFontSize = calculateFontSize(this.canvasManager);
            const newCharacters = this.createCharacters(this.currentText);
            this.gameState?.updateFontSizes();
            this.typeRacer?.handleResize();
            this.typeRacer?.updateCharacters(newCharacters);
        });
    }

    private createCharacters(text: string): Character[] {
        return createCharactersFromText(
            this.canvasManager,
            text,
            this.currentFontSize,
            FONT_FAMILY
        );
    }

    private createCursor(): Cursor {
        return defaultCursor(this.canvasManager, this.currentFontSize);
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
