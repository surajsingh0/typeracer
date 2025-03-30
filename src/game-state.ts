import TypeRacerMetrics from "./metrics";
import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS } from "./constants";

export default class GameState {
    private canvasManager: CanvasManager;
    isOver = false;
    private allParticipantsMetrics: (TypeRacerMetrics & {
        isPlayer?: boolean;
    })[] = [];
    private roomID: string;
    private isHoveringButton = false;
    private buttonPosition: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null = null;
    private baseFontSize = 14;
    private titleFontSize = 22;
    private competitorFontSize = 14;
    private resultsFontSize = 16;
    private winnerFontSize = 18;
    private playerClientId: string | null = null;

    constructor(canvasManager: CanvasManager, roomID: string) {
        this.canvasManager = canvasManager;
        this.roomID = roomID;
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
    }

    draw() {
        this.drawCompetitors();
        this.drawInviteElements();

        if (!this.isOver) {
            return;
        }

        this.drawFinished();
    }

    private setupCanvasInteractions() {
        const canvas = this.canvasManager.canvas;

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

        canvas.addEventListener("mouseout", () => {
            this.isHoveringButton = false;
        });

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
        const padding = Math.min(cssWidth * 0.02, 20);
        const buttonWidth = Math.max(80, cssWidth * 0.1);
        const buttonHeight = Math.max(30, cssHeight * 0.05);
        const cornerRadius = 5;
        const textRightMargin = Math.max(10, cssWidth * 0.015);
        const fontSize = this.baseFontSize;

        ctx.save();

        const buttonX = cssWidth - padding - buttonWidth;
        const buttonY = cssHeight - padding - buttonHeight;

        this.buttonPosition = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
        };

        ctx.fillStyle = "white";
        ctx.font = `${fontSize}px system-ui`;
        ctx.textBaseline = "middle";
        const roomIDText = `Room: ${this.roomID}`;
        const textMetrics = ctx.measureText(roomIDText);
        const textX = buttonX - textMetrics.width - textRightMargin;
        const textY = buttonY + buttonHeight / 2;

        ctx.fillText(roomIDText, textX, textY);

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

        ctx.fillStyle = "white";
        ctx.font = `${fontSize}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(
            "Invite",
            buttonX + buttonWidth / 2,
            buttonY + buttonHeight / 2 + fontSize * 0.1
        );

        ctx.restore();
    }

    private drawCompetitors() {
        const { ctx, cssWidth, cssHeight } = this.canvasManager;
        ctx.save();

        // Define Track Area & Parameters
        const trackAreaHeight = cssHeight * 0.15;
        const trackTopMargin = 0;
        const trackCenterY = trackTopMargin + trackAreaHeight / 2;

        // Define fixed car size (relative to track area height)
        const carHeight = trackAreaHeight * 0.3;
        const carWidth = carHeight * 1.8;

        // Single track Y position (center car vertically in the track area)
        const trackY = trackCenterY - carHeight / 2;

        const trackStartX = cssWidth * 0.02;
        const trackEndX = cssWidth * 0.98;
        const trackLength = trackEndX - trackStartX - carWidth;
        const maxWpmForTrack = 150;

        // Draw Single Track Line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const lineY = trackCenterY;
        ctx.moveTo(trackStartX, lineY);
        ctx.lineTo(trackEndX, lineY);
        ctx.stroke();

        // Draw Finish Line
        ctx.strokeStyle = "white";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trackEndX - carWidth / 2, trackTopMargin);
        ctx.lineTo(trackEndX - carWidth / 2, trackTopMargin + trackAreaHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Player Count
        const playerCount = this.allParticipantsMetrics.length;
        const maxPlayers = 11;
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = `${this.baseFontSize * 0.9}px system-ui`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`Players: ${playerCount}/${maxPlayers}`, trackStartX, trackTopMargin + 5);

        // Draw each participant's car on the single track
        this.allParticipantsMetrics.forEach((participant, index) => {
            const progress = Math.min(1, (participant.wpm || 0) / maxWpmForTrack);
            const carX = trackStartX + progress * trackLength;
            const carY = trackY;

            const color = CURSOR_COLORS[index % CURSOR_COLORS.length].hex;
            this.drawCar(carX, carY, carWidth, carHeight, color);

            // Draw Player ID & Stats next to car with adjusted font sizes
            const labelFontSize = Math.max(12, carHeight * 0.45); // Increased from 0.35
            const statsFontSize = Math.max(11, carHeight * 0.4); // Increased from 0.3

            // Draw Player ID
            ctx.fillStyle = "white";
            ctx.font = `${labelFontSize}px system-ui`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const playerLabel = participant.isPlayer
                ? `${participant.playerID} (You)`
                : participant.playerID;
            const labelY = carY + carHeight * 0.3;
            ctx.fillText(playerLabel, carX + carWidth + 5, labelY);

            // Draw Stats
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.font = `${statsFontSize}px system-ui`;
            const accuracyText = participant.accuracy !== undefined ? `${participant.accuracy.toFixed(0)}%` : 'N/A';
            const statsText = `${participant.wpm || 0} WPM | ${accuracyText}`;
            const statsY = labelY + statsFontSize * 1.2;
            ctx.fillText(statsText, carX + carWidth + 5, statsY);
        });

        ctx.restore();
    }

    private drawCar(
        x: number,
        y: number,
        width: number,
        height: number,
        color: string
    ) {
        const { ctx } = this.canvasManager;
        ctx.save();
        ctx.fillStyle = color;

        const bodyHeight = height * 0.6;
        const bodyWidth = width * 0.9;
        const yOffset = (height - bodyHeight) / 2;
        const xOffset = (width - bodyWidth) / 2;

        ctx.fillRect(x + xOffset, y + yOffset, bodyWidth, bodyHeight);

        ctx.fillStyle = "black";
        const wheelWidth = width * 0.15;
        const wheelHeight = height * 0.2;
        const wheelY = y + yOffset + bodyHeight - wheelHeight / 2;
        ctx.fillRect(
            x + xOffset + width * 0.1,
            wheelY,
            wheelWidth,
            wheelHeight
        );
        ctx.fillRect(
            x + xOffset + bodyWidth - width * 0.1 - wheelWidth,
            wheelY,
            wheelWidth,
            wheelHeight
        );

        ctx.restore();
    }

    private drawFinished() {
        const { ctx, cssWidth, cssHeight, centerX, centerY } =
            this.canvasManager;

        ctx.save();

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        const sortedParticipants = [...this.allParticipantsMetrics].sort(
            (a, b) => (b?.wpm || 0) - (a?.wpm || 0)
        );
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

            if (isWinner) {
                ctx.font = `bold ${currentWinnerFontSize}px system-ui`;
                ctx.fillStyle = "#FFD700";
            } else {
                const participantIndex = this.allParticipantsMetrics.findIndex(
                    (p) => p.id === participant.id
                );
                ctx.fillStyle =
                    participantIndex !== -1
                        ? CURSOR_COLORS[participantIndex % CURSOR_COLORS.length]
                              .hex
                        : isPlayer
                        ? "white"
                        : "gray";
            }

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
