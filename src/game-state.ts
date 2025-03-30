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
        const trackTopMargin = cssHeight * 0.05; // Space above track
        const trackBottomMargin = cssHeight * 0.2; // Space below track (before text area)
        const trackHeight = cssHeight - trackTopMargin - trackBottomMargin;
        const laneHeight = Math.max(
            20,
            Math.min(
                40,
                trackHeight / (this.allParticipantsMetrics.length || 1)
            )
        ); // Dynamic lane height
        const carHeight = laneHeight * 0.7; // Car height relative to lane
        const carWidth = carHeight * 1.8; // Maintain aspect ratio
        const trackStartX = cssWidth * 0.05; // Left padding for track
        const trackEndX = cssWidth * 0.95; // Right padding for track
        const trackLength = trackEndX - trackStartX - carWidth; // Available horizontal distance for movement
        const maxWpmForTrack = 150; // WPM value that corresponds to reaching the finish line

        // Draw Track Lines (optional visual aid)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trackStartX, trackTopMargin);
        ctx.lineTo(trackEndX, trackTopMargin);
        ctx.moveTo(trackStartX, trackTopMargin + trackHeight);
        ctx.lineTo(trackEndX, trackTopMargin + trackHeight);
        ctx.stroke();

        // Draw Finish Line (optional visual aid)
        ctx.strokeStyle = "white";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(trackEndX - carWidth / 2, trackTopMargin); // Position near end
        ctx.lineTo(trackEndX - carWidth / 2, trackTopMargin + trackHeight);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw each participant's car
        this.allParticipantsMetrics.forEach((participant, index) => {
            // Calculate progress (0 to 1)
            const progress = Math.min(
                1,
                (participant.wpm || 0) / maxWpmForTrack
            );

            // Calculate car's X position
            const carX = trackStartX + progress * trackLength;

            // Calculate car's Y position (lane)
            const carY =
                trackTopMargin +
                index * laneHeight +
                (laneHeight - carHeight) / 2; // Center car vertically in its lane

            // Determine color
            const color = CURSOR_COLORS[index % CURSOR_COLORS.length].hex; // Assign color based on index

            // Draw the car
            this.drawCar(carX, carY, carWidth, carHeight, color);

            // Optional: Draw Player ID next to car
            ctx.fillStyle = "white";
            ctx.font = `${Math.max(10, carHeight * 0.4)}px system-ui`; // Font size relative to car
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const playerLabel = participant.isPlayer
                ? `${participant.playerID} (You)`
                : participant.playerID;
            ctx.fillText(
                playerLabel,
                carX + carWidth + 5,
                carY + carHeight / 2
            );
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
