import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS } from "./constants";
import TypeRacerMetrics from "./metrics";

export default class GameOverOverlayRenderer {
    private canvasManager: CanvasManager;
    private titleFontSize: number;
    private resultsFontSize: number;
    private winnerFontSize: number;

    constructor(
        canvasManager: CanvasManager,
        titleFontSize: number,
        resultsFontSize: number,
        winnerFontSize: number
    ) {
        this.canvasManager = canvasManager;
        this.titleFontSize = titleFontSize;
        this.resultsFontSize = resultsFontSize;
        this.winnerFontSize = winnerFontSize;
    }

    updateFontSizes(
        newTitleSize: number,
        newResultsSize: number,
        newWinnerSize: number
    ) {
        this.titleFontSize = newTitleSize;
        this.resultsFontSize = newResultsSize;
        this.winnerFontSize = newWinnerSize;
    }

    draw(
        allParticipantsMetrics: (TypeRacerMetrics & { isPlayer?: boolean })[]
    ) {
        const { ctx, cssWidth, cssHeight, centerX, centerY } =
            this.canvasManager;

        ctx.save();

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        const sortedParticipants = [...allParticipantsMetrics]
            .map((participant, index) => ({
                ...participant,
                originalIndex: index,
            }))
            .sort((a, b) => (b?.wpm || 0) - (a?.wpm || 0));
        const maxWpm = sortedParticipants[0]?.wpm || 0;

        const currentTitleFontSize = this.titleFontSize;
        const currentBaseFontSize = this.resultsFontSize;
        const currentWinnerFontSize = this.winnerFontSize;
        const baseLineHeight = currentBaseFontSize * 1.5;
        const winnerLineHeight = currentWinnerFontSize * 1.5;
        const padding = Math.min(cssWidth * 0.04, 16);

        let totalHeight = padding * 2 + baseLineHeight * 1.5;
        sortedParticipants.forEach((participant) => {
            totalHeight +=
                participant?.wpm === maxWpm ? winnerLineHeight : baseLineHeight;
        });

        const overlayWidth = Math.min(cssWidth * 0.8, 500);
        const overlayHeight = Math.max(totalHeight, cssHeight * 0.3);
        const modalTop = centerY - overlayHeight / 2;
        const modalLeft = centerX - overlayWidth / 2;

        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.beginPath();
        ctx.roundRect(modalLeft, modalTop, overlayWidth, overlayHeight, 8);
        ctx.fill();

        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        let currentY = modalTop + padding;

        ctx.fillStyle = "rgb(230, 230, 230)";
        ctx.font = `${currentTitleFontSize}px system-ui`;
        ctx.fillText("Game Over!", centerX, currentY);
        currentY += baseLineHeight * 1.5;

        sortedParticipants.forEach((participant, index) => {
            const isWinner = participant?.wpm === maxWpm && maxWpm > 0;
            const isPlayer = participant.isPlayer;

            let label = isPlayer
                ? (participant.playerID || "You") + " (You)"
                : participant.playerID || `P ${participant.id.substring(0, 4)}`;

            const position = `#${index + 1}`;

            ctx.font = `${isWinner ? "bold" : ""} ${
                isWinner ? currentWinnerFontSize : currentBaseFontSize
            }px system-ui`;

            ctx.fillStyle = isPlayer
                ? "#B1B1B1" // default cursor hex equivalent color
                : CURSOR_COLORS[
                      (participant.originalIndex - 1) % CURSOR_COLORS.length
                  ].hex;

            const accuracyText =
                participant?.accuracy !== undefined
                    ? `${participant.accuracy.toFixed(1)}%`
                    : "N/A";

            const textLeftMargin = modalLeft + padding * 2;
            const textRightMargin = modalLeft + overlayWidth - padding * 2;
            const textMaxWidth = overlayWidth - padding * 4;

            ctx.textAlign = "left";
            ctx.fillText(
                `${position} ${label}`,
                textLeftMargin,
                currentY,
                textMaxWidth / 2
            );

            ctx.textAlign = "right";
            ctx.fillText(
                `${participant?.wpm} WPM • ${accuracyText}`,
                textRightMargin,
                currentY,
                textMaxWidth / 2
            );

            currentY += isWinner ? winnerLineHeight : baseLineHeight;
        });

        ctx.restore();
    }
}
