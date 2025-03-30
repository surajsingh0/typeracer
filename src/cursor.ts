import CanvasManager from "./canvas-manager";
import Character from "./character";

export default class Cursor {
    private canvasManager: CanvasManager;

    private targetX: number | undefined;
    private targetY: number | undefined;

    private currentX: number | undefined; // for smooth movement)
    private currentY: number | undefined; // for smooth movement

    private color: string;
    private fontSize: number;

    private isVisible: boolean = true;
    private flickerInterval: number = 500;
    private lastUpdate: number = 0;

    private smoothness: number = 0.3; // Smoothness factor for interpolation (0 = instant, 1 = very slow)

    constructor(
        canvasManager: CanvasManager,
        x: number | undefined,
        y: number | undefined,
        color: string,
        fontSize: number
    ) {
        this.canvasManager = canvasManager;
        this.targetX = x;
        this.targetY = y;
        this.currentX = x;
        this.currentY = y;
        this.color = color;
        this.fontSize = fontSize;

        this.startFlicker();
    }

    draw() {
        const { ctx } = this.canvasManager;

        if (
            this.currentX === undefined ||
            this.currentY === undefined ||
            !this.isVisible
        ) {
            return;
        }

        const baselineOffset = this.fontSize * 0.8;
        const cursorY = this.currentY - baselineOffset;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.currentX, cursorY, 2, this.fontSize);
    }

    update() {
        const now = Date.now();

        // Update flickering
        if (now - this.lastUpdate >= this.flickerInterval) {
            this.isVisible = !this.isVisible;
            this.lastUpdate = now;
        }

        // Smoothly interpolate the cursor's position
        if (this.targetX !== undefined && this.targetY !== undefined) {
            if (this.currentX === undefined || this.currentY === undefined) {
                this.currentX = this.targetX;
                this.currentY = this.targetY;
            } else {
                this.currentX +=
                    (this.targetX - this.currentX) * this.smoothness;
                this.currentY +=
                    (this.targetY - this.currentY) * this.smoothness;
            }
        }
    }

    move(curChar: Character) {
        this.targetX = curChar.x + curChar.width + 1;
        this.targetY = curChar.y;

        this.isVisible = true;
        this.lastUpdate = Date.now();
    }

    disappear() {
        this.targetX = undefined;
        this.targetY = undefined;
        this.currentX = undefined;
        this.currentY = undefined;
        this.isVisible = false;
    }

    private startFlicker() {
        const flicker = () => {
            this.update();
            requestAnimationFrame(flicker);
        };

        requestAnimationFrame(flicker);
    }

    get y(): number {
        return this.targetY ?? 0;
    }

    reset() {
        this.targetX = undefined;
        this.targetY = undefined;
        this.currentX = undefined;
        this.currentY = undefined;
        this.isVisible = false;
    }
}

export const defaultCursor = (
    canvasManager: CanvasManager,
    fontSize: number,
    color: string = "rgb(177, 177, 177)"
) => {
    return new Cursor(canvasManager, undefined, undefined, color, fontSize);
};
