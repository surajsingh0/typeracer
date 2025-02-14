import TypeRacerMetrics from "./metrics";
import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS } from "./constants";

export default class GameState {
    private canvasManager: CanvasManager;
    isOver = false;
    private typeRacerMetrics: TypeRacerMetrics | undefined;
    private competitorsMetrics: TypeRacerMetrics[] = [];

    constructor(canvasManager: CanvasManager) {
        this.canvasManager = canvasManager;
    }

    set metrics(typeRacerMetrics: TypeRacerMetrics) {
        this.typeRacerMetrics = typeRacerMetrics;
    }

    set competitorMetric(metrics: TypeRacerMetrics) {
        this.competitorsMetrics.push(metrics);
    }

    updateWpm(id: number, wpm: number) {
        this.competitorsMetrics[id].wpm = wpm;
    }

    draw() {
        this.drawCompetitors();

        if (!this.isOver || this.typeRacerMetrics === undefined) {
            return;
        }

        this.drawFinished();
    }

    private drawCompetitors() {
        const { ctx, cssWidth } = this.canvasManager;

        const startX = cssWidth * 0.2;
        const startY = 50;
        const blockWidth = 100;
        const blockHeight = 20;
        const margin = 25;

        let currentX = startX;
        let currentY = startY;

        for (let i = 0; i < this.competitorsMetrics.length; i++) {
            const metrics = this.competitorsMetrics[i];
            const color =
                metrics.id !== undefined
                    ? CURSOR_COLORS[metrics.id].hex
                    : "gray";

            if (currentX + blockWidth > cssWidth) {
                currentX = startX;
                currentY += blockHeight + margin;
            }

            ctx.fillStyle = color;
            ctx.fillText(`WPM: ${metrics.wpm}`, currentX, currentY, blockWidth);

            currentX += blockWidth + margin;
        }
    }

    private drawFinished() {
        const { ctx, cssWidth, cssHeight, centerX, centerY } =
            this.canvasManager;

        ctx.save();

        // Dim the background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        // Combine all participants including player
        const allParticipants = [
            ...this.competitorsMetrics,
            this.typeRacerMetrics,
        ];

        // Sort by WPM descending
        const sortedCompetitors = allParticipants.sort(
            (a, b) => (b?.wpm || 0) - (a?.wpm || 0)
        );
        const maxWpm = sortedCompetitors[0]?.wpm || 0;

        // Calculate dynamic dimensions
        const baseFontSize = 20;
        const winnerFontSize = 24;
        const baseLineHeight = 30;
        const winnerLineHeight = 35;
        const padding = 20;

        // Calculate total height
        let totalHeight = padding * 2 + baseLineHeight * 1.5; // Game Over! + spacing
        sortedCompetitors.forEach((metrics) => {
            totalHeight +=
                metrics?.wpm === maxWpm ? winnerLineHeight : baseLineHeight;
        });

        const overlayWidth = 350;
        const overlayHeight = Math.max(totalHeight, 200);
        const modalTop = centerY - overlayHeight / 2;

        // Draw overlay
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.fillRect(
            centerX - overlayWidth / 2,
            modalTop,
            overlayWidth,
            overlayHeight
        );

        // Set initial styles
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        let currentY = modalTop + padding;

        // Draw game over text
        ctx.fillStyle = "rgb(230, 230, 230)";
        ctx.font = `${baseFontSize}px monospace`;
        ctx.fillText("Game Over!", centerX, currentY);
        currentY += baseLineHeight * 1.5;

        // Draw all competitors including player
        sortedCompetitors.forEach((metrics) => {
            const isWinner = metrics?.wpm === maxWpm;
            const isPlayer = metrics === this.typeRacerMetrics;
            const label = isPlayer ? "You" : `Player ${metrics?.id}`;

            // Set winner styles
            if (isWinner) {
                ctx.font = `bold ${winnerFontSize}px monospace`;
                ctx.fillStyle = "#FFD700"; // Gold color for winner
            } else {
                ctx.font = `${baseFontSize}px monospace`;
                ctx.fillStyle =
                    metrics?.id !== undefined
                        ? CURSOR_COLORS[metrics.id].hex
                        : "gray";
            }

            // Draw text
            ctx.fillText(
                `${label}: ${metrics?.wpm} WPM`,
                centerX,
                currentY,
                overlayWidth - padding * 2
            );

            // Update Y position
            currentY += isWinner ? winnerLineHeight : baseLineHeight;
        });

        ctx.restore();
    }
}
