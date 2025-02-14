export default class CanvasManager {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    readonly devicePixelRatio: number;

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext("2d")!;
        this.devicePixelRatio = window.devicePixelRatio || 1;

        this.resize();
    }

    private resize() {
        // Set actual canvas buffer size
        this.canvas.width = window.innerWidth * this.devicePixelRatio;
        this.canvas.height = window.innerHeight * this.devicePixelRatio;

        // Set displayed CSS size
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;

        // Scale context for crisp rendering
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    }

    // Convert CSS pixels to canvas pixels
    cssToCanvasPixels(value: number): number {
        return value * this.devicePixelRatio;
    }

    // Get dimensions in CSS pixels
    get cssWidth(): number {
        return window.innerWidth;
    }

    get cssHeight(): number {
        return window.innerHeight;
    }

    // Get center positions in CSS pixels
    get centerX(): number {
        return this.cssWidth / 2;
    }

    get centerY(): number {
        return this.cssHeight / 2;
    }
}
