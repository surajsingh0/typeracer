import TypeRacerMetrics from "./metrics";
import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS } from "./constants";
import TrackRenderer from "./track-renderer";
import GameOverOverlayRenderer from "./game-over-overlay-renderer";
import UIElementsRenderer from "./ui-elements-renderer";

export default class GameState {
    private canvasManager: CanvasManager;
    isOver = false;
    private allParticipantsMetrics: (TypeRacerMetrics & {
        isPlayer?: boolean;
    })[] = [];
    private roomID: string;
    private isHoveringButton = false;
    private buttonPosition: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
    private baseFontSize = 14;
    private titleFontSize = 22;
    private competitorFontSize = 14;
    private resultsFontSize = 16;
    private winnerFontSize = 18;
    private playerClientId: string | null = null;

    private trackRenderer: TrackRenderer;
    private gameOverOverlayRenderer: GameOverOverlayRenderer;
    private uiElementsRenderer: UIElementsRenderer;

    constructor(canvasManager: CanvasManager, roomID: string) {
        this.canvasManager = canvasManager;
        this.roomID = roomID;

        this.trackRenderer = new TrackRenderer(this.canvasManager, this.baseFontSize);
        this.gameOverOverlayRenderer = new GameOverOverlayRenderer(
            this.canvasManager,
            this.titleFontSize,
            this.resultsFontSize,
            this.winnerFontSize
        );
        this.uiElementsRenderer = new UIElementsRenderer(this.canvasManager, this.baseFontSize);

        this.updateFontSizes();
        this.setupCanvasInteractions();
    }

    registerPlayer(clientId: string, playerTextId: string) {
        this.playerClientId = clientId;
        this.removeParticipantMetric(clientId);
        this.allParticipantsMetrics.push({
            id: clientId,
            playerID: playerTextId,
            wpm: 0,
            accuracy: 0,
            isPlayer: true,
        });
    }

    updateCompetitorMetric(metrics: TypeRacerMetrics) {
        const index = this.allParticipantsMetrics.findIndex(
            (p) => p.id === metrics.id
        );
        if (index === -1) {
            if (metrics.id !== this.playerClientId) {
                this.allParticipantsMetrics.push({
                    ...metrics,
                    isPlayer: false,
                });
            }
        } else {
            this.allParticipantsMetrics[index] = {
                ...this.allParticipantsMetrics[index],
                ...metrics,
            };
        }
    }

    removeParticipantMetric(id: string) {
        const index = this.allParticipantsMetrics.findIndex(
            (participantMetric) => participantMetric.id === id
        );
        if (index !== -1) {
            this.allParticipantsMetrics.splice(index, 1);
        }
    }

    updateWpm(id: string, wpm: number) {
        const participant = this.allParticipantsMetrics.find(
            (p) => p.id === id
        );
        if (participant) {
            participant.wpm = wpm;
        } else {
            console.warn(
                `Tried to update WPM for unknown participant ID: ${id}`
            );
        }
    }

    updateAccuracy(id: string, accuracy: number) {
        const participant = this.allParticipantsMetrics.find(
            (p) => p.id === id
        );
        if (participant) {
            participant.accuracy = accuracy;
        } else {
            console.warn(
                `Tried to update Accuracy for unknown participant ID: ${id}`
            );
        }
    }

    updateFontSizes() {
        const width = this.canvasManager.cssWidth;
        if (width < 600) {
            this.baseFontSize = 12;
            this.titleFontSize = 18;
            this.competitorFontSize = 12;
            this.resultsFontSize = 14;
            this.winnerFontSize = 16;
        } else if (width < 900) {
            this.baseFontSize = 14;
            this.titleFontSize = 22;
            this.competitorFontSize = 14;
            this.resultsFontSize = 16;
            this.winnerFontSize = 18;
        } else {
            this.baseFontSize = 16;
            this.titleFontSize = 24;
            this.competitorFontSize = 16;
            this.resultsFontSize = 18;
            this.winnerFontSize = 20;
        }
        this.trackRenderer?.updateFontSize(this.baseFontSize);
        this.gameOverOverlayRenderer?.updateFontSizes(
            this.titleFontSize,
            this.resultsFontSize,
            this.winnerFontSize
        );
        this.uiElementsRenderer?.updateFontSize(this.baseFontSize);
    }

    draw() {
        this.trackRenderer.draw(this.allParticipantsMetrics);
        this.uiElementsRenderer.draw(
            this.roomID,
            this.isHoveringButton,
            this.buttonPosition
        );

        if (this.isOver) {
            this.gameOverOverlayRenderer.draw(this.allParticipantsMetrics);
        }
    }

    private setupCanvasInteractions() {
        const canvas = this.canvasManager.canvas;

        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.isHoveringButton =
                x >= this.buttonPosition.x &&
                x <= this.buttonPosition.x + this.buttonPosition.width &&
                y >= this.buttonPosition.y &&
                y <= this.buttonPosition.y + this.buttonPosition.height;
        });

        canvas.addEventListener("mouseout", () => {
            this.isHoveringButton = false;
        });

        canvas.addEventListener("click", (e) => {
            if (this.isHoveringButton) {
                const inviteUrl = `${window.location.origin}?room=${this.roomID}`;
                navigator.clipboard.writeText(inviteUrl);
                alert("Invite link copied to clipboard!");
            }
        });
    }
}
