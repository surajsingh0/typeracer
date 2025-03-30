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
        const trackTopMargin = 30; // Increased margin for player count
        const trackCenterY = trackTopMargin + trackAreaHeight / 2;

        // Draw Player Count with background
        const playerCount = this.allParticipantsMetrics.length;
        const maxPlayers = 11;
        const playerCountText = `Players: ${playerCount}/${maxPlayers}`;
        ctx.font = `bold ${this.baseFontSize}px system-ui`;
        const textMetrics = ctx.measureText(playerCountText);
        const padding = 8;
        const playerCountX = cssWidth * 0.02;
        const playerCountY = 8;
        const playerCountWidth = textMetrics.width + padding * 2;
        const playerCountHeight = this.baseFontSize * 1.4;

        // Draw background for player count
        ctx.fillStyle = "rgba(30, 30, 30, 0.8)";
        ctx.beginPath();
        ctx.roundRect(playerCountX - padding, playerCountY - padding, playerCountWidth, playerCountHeight + padding * 2, 4);
        ctx.fill();

        // Draw player count text
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(playerCountText, playerCountX, playerCountY);

        // Define fixed car size (relative to track area height)
        const carHeight = trackAreaHeight * 0.25; // Slightly smaller cars
        const carWidth = carHeight * 2;

        // Single track Y position (center car vertically in the track area)
        const trackY = trackCenterY - carHeight / 2;

        const trackStartX = cssWidth * 0.02;
        const trackEndX = cssWidth * 0.98;
        const trackLength = trackEndX - trackStartX - carWidth;
        const maxWpmForTrack = 150;

        // Draw Track Background
        const trackBackgroundHeight = trackAreaHeight * 0.7; // Slightly smaller track
        const trackBackgroundY = trackCenterY - trackBackgroundHeight / 2;
        
        // Draw track shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.roundRect(trackStartX + 2, trackBackgroundY + 2, trackEndX - trackStartX, trackBackgroundHeight, 5);
        ctx.fill();

        // Draw main track background with gradient
        const trackGradient = ctx.createLinearGradient(0, trackBackgroundY, 0, trackBackgroundY + trackBackgroundHeight);
        trackGradient.addColorStop(0, "rgba(70, 70, 70, 0.8)");
        trackGradient.addColorStop(0.5, "rgba(50, 50, 50, 0.8)");
        trackGradient.addColorStop(1, "rgba(30, 30, 30, 0.8)");
        
        ctx.fillStyle = trackGradient;
        ctx.beginPath();
        ctx.roundRect(trackStartX, trackBackgroundY, trackEndX - trackStartX, trackBackgroundHeight, 5);
        ctx.fill();

        // Draw lane markers
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.setLineDash([20, 15]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        const laneY = trackCenterY;
        ctx.moveTo(trackStartX + 30, laneY);
        ctx.lineTo(trackEndX - carWidth / 2 - 20, laneY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw track borders with gradient
        const borderGradient = ctx.createLinearGradient(0, trackBackgroundY, 0, trackBackgroundY + trackBackgroundHeight);
        borderGradient.addColorStop(0, "rgba(255, 255, 255, 0.7)");
        borderGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
        borderGradient.addColorStop(1, "rgba(255, 255, 255, 0.7)");
        
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Top border
        ctx.moveTo(trackStartX, trackBackgroundY);
        ctx.lineTo(trackEndX, trackBackgroundY);
        // Bottom border
        ctx.moveTo(trackStartX, trackBackgroundY + trackBackgroundHeight);
        ctx.lineTo(trackEndX, trackBackgroundY + trackBackgroundHeight);
        ctx.stroke();

        // Draw Start Line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(trackStartX + 20, trackBackgroundY);
        ctx.lineTo(trackStartX + 20, trackBackgroundY + trackBackgroundHeight);
        ctx.stroke();

        // Draw Finish Line (checkered pattern)
        const finishLineX = trackEndX - carWidth / 2;
        const squareSize = 10;
        const numSquares = Math.ceil(trackBackgroundHeight / squareSize);
        
        for (let i = 0; i < numSquares; i++) {
            for (let j = 0; j < 2; j++) {
                const x = finishLineX + j * squareSize;
                const y = trackBackgroundY + i * squareSize;
                if ((i + j) % 2 === 0) {
                    ctx.fillStyle = "white";
                    ctx.fillRect(x, y, squareSize, squareSize);
                }
            }
        }

        // Draw each participant's car on the single track
        this.allParticipantsMetrics.forEach((participant, index) => {
            const progress = Math.min(1, (participant.wpm || 0) / maxWpmForTrack);
            const carX = trackStartX + progress * trackLength;
            const carY = trackY;

            const color = CURSOR_COLORS[index % CURSOR_COLORS.length].hex;
            this.drawCar(carX, carY, carWidth, carHeight, color);

            // Create stats container
            const labelFontSize = Math.max(11, carHeight * 0.45);
            const statsFontSize = Math.max(10, carHeight * 0.4);
            const statsContainerPadding = 6;
            const statsX = carX + carWidth + 5;
            const statsY = carY - statsContainerPadding;
            const playerLabel = participant.isPlayer ? `${participant.playerID} (You)` : participant.playerID;
            const accuracyText = participant.accuracy !== undefined ? `${participant.accuracy.toFixed(0)}%` : 'N/A';
            const statsText = `${participant.wpm || 0} WPM | ${accuracyText}`;
            
            ctx.font = `${labelFontSize}px system-ui`;
            const labelWidth = ctx.measureText(playerLabel).width;
            ctx.font = `${statsFontSize}px system-ui`;
            const statsWidth = ctx.measureText(statsText).width;
            const containerWidth = Math.max(labelWidth, statsWidth) + statsContainerPadding * 2;
            const containerHeight = labelFontSize + statsFontSize + statsContainerPadding * 3;

            // Draw stats background
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.beginPath();
            ctx.roundRect(statsX, statsY, containerWidth, containerHeight, 4);
            ctx.fill();

            // Draw Player ID
            ctx.fillStyle = "white";
            ctx.font = `${labelFontSize}px system-ui`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(playerLabel, statsX + statsContainerPadding, statsY + statsContainerPadding);

            // Draw Stats
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.font = `${statsFontSize}px system-ui`;
            ctx.fillText(statsText, statsX + statsContainerPadding, statsY + labelFontSize + statsContainerPadding * 1.5);
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

        const bodyHeight = height * 0.6;
        const bodyWidth = width * 0.9;
        const yOffset = (height - bodyHeight) / 2;
        const xOffset = (width - bodyWidth) / 2;

        // Draw car shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.roundRect(x + xOffset + 2, y + yOffset + 2, bodyWidth, bodyHeight, 4);
        ctx.fill();

        // Draw car body with gradient
        const gradient = ctx.createLinearGradient(x + xOffset, y + yOffset, x + xOffset, y + yOffset + bodyHeight);
        const brighterColor = this.adjustColor(color, 20);
        const darkerColor = this.adjustColor(color, -20);
        gradient.addColorStop(0, brighterColor);
        gradient.addColorStop(1, darkerColor);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + xOffset, y + yOffset, bodyWidth, bodyHeight, 4);
        ctx.fill();

        // Draw car details (windshield)
        ctx.fillStyle = "rgba(200, 200, 200, 0.8)";
        const windshieldWidth = bodyWidth * 0.3;
        const windshieldHeight = bodyHeight * 0.6;
        const windshieldX = x + xOffset + bodyWidth * 0.6;
        const windshieldY = y + yOffset + (bodyHeight - windshieldHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(windshieldX, windshieldY, windshieldWidth, windshieldHeight, 2);
        ctx.fill();

        // Draw wheels with shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        const wheelWidth = width * 0.15;
        const wheelHeight = height * 0.25;
        const wheelY = y + yOffset + bodyHeight - wheelHeight / 2;

        // Front wheel shadow
        ctx.beginPath();
        ctx.roundRect(
            x + xOffset + width * 0.1 + 1,
            wheelY + 1,
            wheelWidth,
            wheelHeight,
            2
        );
        ctx.fill();

        // Back wheel shadow
        ctx.beginPath();
        ctx.roundRect(
            x + xOffset + bodyWidth - width * 0.1 - wheelWidth + 1,
            wheelY + 1,
            wheelWidth,
            wheelHeight,
            2
        );
        ctx.fill();

        // Draw actual wheels
        ctx.fillStyle = "rgb(40, 40, 40)";
        
        // Front wheel
        ctx.beginPath();
        ctx.roundRect(
            x + xOffset + width * 0.1,
            wheelY,
            wheelWidth,
            wheelHeight,
            2
        );
        ctx.fill();

        // Back wheel
        ctx.beginPath();
        ctx.roundRect(
            x + xOffset + bodyWidth - width * 0.1 - wheelWidth,
            wheelY,
            wheelWidth,
            wheelHeight,
            2
        );
        ctx.fill();

        ctx.restore();
    }

    private adjustColor(color: string, amount: number): string {
        // Remove the '#' if present
        const hex = color.replace('#', '');
        
        // Convert to RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Adjust each component
        const adjustComponent = (c: number) => Math.min(255, Math.max(0, c + amount));
        const newR = adjustComponent(r);
        const newG = adjustComponent(g);
        const newB = adjustComponent(b);
        
        // Convert back to hex
        const toHex = (c: number) => {
            const hex = c.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
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
