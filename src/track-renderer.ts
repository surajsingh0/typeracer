import CanvasManager from "./canvas-manager";
import { CURSOR_COLORS } from "./constants";
import TypeRacerMetrics from "./metrics";

export default class TrackRenderer {
    private canvasManager: CanvasManager;
    private baseFontSize: number;
    private carPositions: Map<string, number>; // Store current visual X for each car
    private readonly carSmoothness: number = 0.1; // Adjust for desired smoothness (lower = smoother)

    constructor(canvasManager: CanvasManager, baseFontSize: number) {
        this.canvasManager = canvasManager;
        this.baseFontSize = baseFontSize;
        this.carPositions = new Map<string, number>();
    }

    updateFontSize(newSize: number) {
        this.baseFontSize = newSize;
    }

    draw(
        allParticipantsMetrics: (TypeRacerMetrics & { isPlayer?: boolean })[]
    ) {
        const { ctx, cssWidth, cssHeight } = this.canvasManager;
        ctx.save();

        // Define Track Area & Parameters
        const trackAreaHeight = cssHeight * 0.15;
        const trackTopMargin = 30; // Increased margin for player count
        const trackCenterY = trackTopMargin + trackAreaHeight / 2;

        // Draw Player Count with background
        const playerCount = allParticipantsMetrics.length;
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
        ctx.roundRect(
            playerCountX - padding,
            playerCountY - padding,
            playerCountWidth,
            playerCountHeight + padding * 2,
            4
        );
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
        ctx.roundRect(
            trackStartX + 2,
            trackBackgroundY + 2,
            trackEndX - trackStartX,
            trackBackgroundHeight,
            5
        );
        ctx.fill();

        // Draw main track background with gradient
        const trackGradient = ctx.createLinearGradient(
            0,
            trackBackgroundY,
            0,
            trackBackgroundY + trackBackgroundHeight
        );
        trackGradient.addColorStop(0, "rgba(70, 70, 70, 0.8)");
        trackGradient.addColorStop(0.5, "rgba(50, 50, 50, 0.8)");
        trackGradient.addColorStop(1, "rgba(30, 30, 30, 0.8)");

        ctx.fillStyle = trackGradient;
        ctx.beginPath();
        ctx.roundRect(
            trackStartX,
            trackBackgroundY,
            trackEndX - trackStartX,
            trackBackgroundHeight,
            5
        );
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
        const borderGradient = ctx.createLinearGradient(
            0,
            trackBackgroundY,
            0,
            trackBackgroundY + trackBackgroundHeight
        );
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

        // Clean up car positions for participants who left
        const currentParticipantIds = new Set(
            allParticipantsMetrics.map((p) => p.id)
        );
        for (const id of this.carPositions.keys()) {
            if (!currentParticipantIds.has(id)) {
                this.carPositions.delete(id);
            }
        }

        // Draw each participant's car with smooth movement
        allParticipantsMetrics.forEach((participant, index) => {
            // Calculate target X based on WPM
            const progress = Math.min(
                1,
                (participant.wpm || 0) / maxWpmForTrack
            );
            const targetCarX = trackStartX + progress * trackLength;

            // Get current visual X or initialize
            let currentCarX = this.carPositions.get(participant.id);
            if (currentCarX === undefined) {
                currentCarX = targetCarX; // Initialize to target position
            }

            // Interpolate towards the target position
            currentCarX += (targetCarX - currentCarX) * this.carSmoothness;
            this.carPositions.set(participant.id, currentCarX); // Update stored position

            const carY = trackY;

            const color = CURSOR_COLORS[index % CURSOR_COLORS.length].hex;
            // Use currentCarX for drawing
            this.drawCar(currentCarX, carY, carWidth, carHeight, color);

            // Position stats container relative to the smoothed currentCarX
            const labelFontSize = Math.max(11, carHeight * 0.45);
            const statsFontSize = Math.max(10, carHeight * 0.4);
            const statsContainerPadding = 6;
            const statsX = currentCarX + carWidth + 5; // Use currentCarX
            const statsY = carY - statsContainerPadding;
            const playerLabel = participant.isPlayer
                ? `${participant.playerID} (You)`
                : participant.playerID;
            const accuracyText =
                participant.accuracy !== undefined
                    ? `${participant.accuracy.toFixed(0)}%`
                    : "N/A";
            const statsText = `${participant.wpm || 0} WPM | ${accuracyText}`;

            ctx.font = `${labelFontSize}px system-ui`;
            const labelWidth = ctx.measureText(playerLabel).width;
            ctx.font = `${statsFontSize}px system-ui`;
            const statsWidth = ctx.measureText(statsText).width;
            const containerWidth =
                Math.max(labelWidth, statsWidth) + statsContainerPadding * 2;
            const containerHeight =
                labelFontSize + statsFontSize + statsContainerPadding * 3;

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
            ctx.fillText(
                playerLabel,
                statsX + statsContainerPadding,
                statsY + statsContainerPadding
            );

            // Draw Stats
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.font = `${statsFontSize}px system-ui`;
            ctx.fillText(
                statsText,
                statsX + statsContainerPadding,
                statsY + labelFontSize + statsContainerPadding * 1.5
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

        const bodyHeight = height * 0.6;
        const bodyWidth = width * 0.9;
        const yOffset = (height - bodyHeight) / 2;
        const xOffset = (width - bodyWidth) / 2;

        // Draw car shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.roundRect(
            x + xOffset + 2,
            y + yOffset + 2,
            bodyWidth,
            bodyHeight,
            4
        );
        ctx.fill();

        // Draw car body with gradient
        const gradient = ctx.createLinearGradient(
            x + xOffset,
            y + yOffset,
            x + xOffset,
            y + yOffset + bodyHeight
        );
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
        ctx.roundRect(
            windshieldX,
            windshieldY,
            windshieldWidth,
            windshieldHeight,
            2
        );
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
        const hex = color.replace("#", "");

        // Convert to RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Adjust each component
        const adjustComponent = (c: number) =>
            Math.min(255, Math.max(0, c + amount));
        const newR = adjustComponent(r);
        const newG = adjustComponent(g);
        const newB = adjustComponent(b);

        // Convert back to hex
        const toHex = (c: number) => {
            const hex = c.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };

        return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }
}
