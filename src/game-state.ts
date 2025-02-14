import TypeRacerMetrics from "./metrics";
import CanvasManager from "./canvas-manager";

export default class GameState {
    private canvasManager: CanvasManager;
    isOver = false;
    private typeRacerMetrics: TypeRacerMetrics | undefined;

    constructor(canvasManager: CanvasManager) {
        this.canvasManager = canvasManager;
    }

    set metrics(typeRacerMetrics: TypeRacerMetrics) {
        this.typeRacerMetrics = typeRacerMetrics;
    }

    draw() {
        if (!this.isOver || this.typeRacerMetrics === undefined) {
            return;
        }

        const { ctx, cssWidth, cssHeight, centerX, centerY } =
            this.canvasManager;

        ctx.save();

        // Dim the background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        const overlayWidth = 300;
        const overlayHeight = 200;

        // Draw overlay
        ctx.fillStyle = "gray";
        ctx.fillRect(
            centerX - overlayWidth / 2,
            centerY - overlayHeight / 2,
            overlayWidth,
            overlayHeight
        );

        // Draw text
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            `WPM: ${this.typeRacerMetrics.wpm}`,
            centerX,
            centerY - 20
        );

        ctx.fillText("Game Over!", centerX, centerY + 20);

        ctx.restore();
    }
}
