import TypeRacerMetrics from "./metrics";
import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS } from "./constants";

export default class GameState {
    private canvasManager: CanvasManager;
    isOver = false;
    private typeRacerMetrics: TypeRacerMetrics | undefined;
    private competitorsMetrics: TypeRacerMetrics[] = [];
    private roomID: string;
    private isHoveringButton = false;
    private buttonPosition: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null = null;

    constructor(canvasManager: CanvasManager, roomID: string) {
        this.canvasManager = canvasManager;
        this.roomID = roomID;

        this.setupCanvasInteractions();
    }

    set metrics(typeRacerMetrics: TypeRacerMetrics) {
        this.typeRacerMetrics = typeRacerMetrics;
    }

    set competitorMetric(metrics: TypeRacerMetrics) {
        this.competitorsMetrics.push(metrics);
    }

    removeCompetitorMetric(id: number) {
        const index = this.competitorsMetrics.findIndex(
            (competitorMetric) => competitorMetric.id === id
        );

        this.competitorsMetrics.splice(index, 1);
    }

    updateWpm(id: number, wpm: number) {
        this.competitorsMetrics[id].wpm = wpm;
    }

    updateAccuracy(id: number, accuracy: number) {
        this.competitorsMetrics[id].accuracy = accuracy;
    }

    draw() {
        this.drawCompetitors();
        this.drawInviteElements();

        if (!this.isOver || this.typeRacerMetrics === undefined) {
            return;
        }

        this.drawFinished();
    }

    private setupCanvasInteractions() {
        const canvas = this.canvasManager.canvas;

        // Mouse move handler for hover effect
        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.buttonPosition) {
                this.isHoveringButton =
                    x >= this.buttonPosition.x &&
                    x <= this.buttonPosition.x + this.buttonPosition.width &&
                    y >= this.buttonPosition.y &&
                    y <= this.buttonPosition.y + this.buttonPosition.height;
            }
        });

        // Mouse out handler to clear hover state
        canvas.addEventListener("mouseout", () => {
            this.isHoveringButton = false;
        });

        // Click handler for copy functionality
        canvas.addEventListener("click", (e) => {
            if (this.isHoveringButton && this.buttonPosition) {
                const inviteUrl = `${window.location.origin}?room=${this.roomID}`;
                navigator.clipboard.writeText(inviteUrl);
                alert("Invite link copied to clipboard!");
            }
        });
    }

    private drawInviteElements() {
        const { ctx, cssWidth, cssHeight } = this.canvasManager;
        const padding = 20;
        const buttonWidth = 80;
        const buttonHeight = 30;
        const cornerRadius = 5;
        const textRightMargin = 15;

        ctx.save();

        // Calculate positions
        const buttonX = cssWidth - padding - buttonWidth;
        const buttonY = cssHeight - padding - buttonHeight;

        // Store button position for interaction detection
        this.buttonPosition = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
        };

        // Draw room ID
        ctx.fillStyle = "white";
        ctx.font = "14px system-ui";
        ctx.textBaseline = "middle";
        const roomIDText = `Room: ${this.roomID}`;
        const textMetrics = ctx.measureText(roomIDText);
        const textX = buttonX - textMetrics.width - textRightMargin;
        const textY = buttonY + buttonHeight / 2;

        ctx.fillText(roomIDText, textX, textY);

        // Draw button with hover effect
        ctx.fillStyle = this.isHoveringButton ? "#0056b3" : "#007bff";
        ctx.beginPath();
        ctx.roundRect(
            buttonX,
            buttonY,
            buttonWidth,
            buttonHeight,
            cornerRadius
        );
        ctx.fill();

        // Draw button text
        ctx.fillStyle = "white";
        ctx.font = "14px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(
            "Invite",
            buttonX + buttonWidth / 2,
            buttonY + buttonHeight / 2 + 2 // Visual centering adjustment
        );

        ctx.restore();
    }

    private drawCompetitors() {
        const { ctx, cssWidth } = this.canvasManager;

        ctx.save();

        const startX = cssWidth * 0.2;
        const startY = 30;
        const blockWidth = 150;
        const blockHeight = 25;
        const margin = 20;

        let currentX = startX;
        let currentY = startY;

        ctx.font = "14px system-ui";

        for (let i = 0; i < this.competitorsMetrics.length; i++) {
            const metrics = this.competitorsMetrics[i];
            const color =
                metrics.id !== undefined
                    ? CURSOR_COLORS[metrics.id].hex
                    : "gray";

            if (currentX + blockWidth > cssWidth - 20) {
                currentX = startX;
                currentY += blockHeight + margin;
            }

            ctx.fillStyle = color;

            const accuracyText =
                metrics.accuracy !== undefined
                    ? `${metrics.accuracy.toFixed(1)}%`
                    : "N/A";
            const playerIDText = metrics.playerID || `Player ${metrics.id}`;

            ctx.fillText(playerIDText, currentX, currentY, blockWidth);

            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "18px system-ui";
            ctx.fillText(
                `${metrics.wpm} WPM • ${accuracyText}`,
                currentX,
                currentY + blockHeight - 4,
                blockWidth + 20
            );

            ctx.font = "14px system-ui";

            currentX += blockWidth + margin;
        }

        ctx.restore();
    }

    private drawFinished() {
        const { ctx, cssWidth, cssHeight, centerX, centerY } =
            this.canvasManager;

        ctx.save();

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        const allParticipants = [
            ...this.competitorsMetrics,
            {
                ...this.typeRacerMetrics,
                playerID: this.typeRacerMetrics?.playerID + " (You)",
            },
        ];
        const sortedCompetitors = allParticipants.sort(
            (a, b) => (b?.wpm || 0) - (a?.wpm || 0)
        );
        const maxWpm = sortedCompetitors[0]?.wpm || 0;

        const titleFontSize = 22;
        const baseFontSize = 16;
        const winnerFontSize = 18;
        const baseLineHeight = 24;
        const winnerLineHeight = 28;
        const padding = 16;

        let totalHeight = padding * 2 + baseLineHeight * 1.5;
        sortedCompetitors.forEach((metrics) => {
            totalHeight +=
                metrics?.wpm === maxWpm ? winnerLineHeight : baseLineHeight;
        });

        const overlayWidth = 400;
        const overlayHeight = Math.max(totalHeight, 180);
        const modalTop = centerY - overlayHeight / 2;

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.beginPath();
        ctx.roundRect(
            centerX - overlayWidth / 2,
            modalTop,
            overlayWidth,
            overlayHeight,
            8
        );
        ctx.fill();

        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        let currentY = modalTop + padding;

        ctx.fillStyle = "rgb(230, 230, 230)";
        ctx.font = `${titleFontSize}px system-ui`;
        ctx.fillText("Game Over!", centerX, currentY);
        currentY += baseLineHeight * 1.5;

        sortedCompetitors.forEach((metrics, index) => {
            const isWinner = metrics?.wpm === maxWpm;
            const isPlayer = metrics === this.typeRacerMetrics;

            let label = isPlayer
                ? metrics?.playerID || "You"
                : metrics?.playerID || `Player ${metrics?.id}`;

            const position = `#${index + 1}`;

            if (isWinner) {
                ctx.font = `bold ${winnerFontSize}px system-ui`;
                ctx.fillStyle = "#FFD700";
            } else {
                ctx.font = `${baseFontSize}px system-ui`;
                ctx.fillStyle =
                    metrics?.id !== undefined
                        ? CURSOR_COLORS[metrics.id].hex
                        : "gray";
            }

            const accuracyText =
                metrics?.accuracy !== undefined
                    ? `${metrics.accuracy.toFixed(1)}%`
                    : "N/A";

            ctx.textAlign = "left";
            ctx.fillText(
                `${position} ${label}`,
                centerX - overlayWidth / 2 + padding * 2,
                currentY,
                overlayWidth - padding * 4
            );

            ctx.textAlign = "right";
            ctx.fillText(
                `${metrics?.wpm} WPM • ${accuracyText}`,
                centerX + overlayWidth / 2 - padding * 2,
                currentY
            );

            currentY += isWinner ? winnerLineHeight : baseLineHeight;
        });

        ctx.restore();
    }
}
