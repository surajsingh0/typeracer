import CanvasManager from "./canvas-manager";

export default class UIElementsRenderer {
    private canvasManager: CanvasManager;
    private baseFontSize: number;

    constructor(canvasManager: CanvasManager, baseFontSize: number) {
        this.canvasManager = canvasManager;
        this.baseFontSize = baseFontSize;
    }

    updateFontSize(newSize: number) {
        this.baseFontSize = newSize;
    }

    draw(
        roomID: string,
        isHoveringButton: boolean,
        buttonPosition: { x: number; y: number; width: number; height: number }
    ) {
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

        // Update the passed buttonPosition object
        buttonPosition.x = buttonX;
        buttonPosition.y = buttonY;
        buttonPosition.width = buttonWidth;
        buttonPosition.height = buttonHeight;

        ctx.fillStyle = "white";
        ctx.font = `${fontSize}px system-ui`;
        ctx.textBaseline = "middle";
        const roomIDText = `Room: ${roomID}`;
        const textMetrics = ctx.measureText(roomIDText);
        const textX = buttonX - textMetrics.width - textRightMargin;
        const textY = buttonY + buttonHeight / 2;

        ctx.fillText(roomIDText, textX, textY);

        ctx.fillStyle = isHoveringButton ? "#0056b3" : "#007bff";
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
}
