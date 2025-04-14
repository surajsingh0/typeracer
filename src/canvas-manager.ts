export default class CanvasManager {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    readonly devicePixelRatio: number;
    private resizeCallback: (() => void) | null = null;

    constructor(canvasElement: HTMLCanvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext("2d")!;
        this.devicePixelRatio = window.devicePixelRatio || 1;

        this.handleResize = this.handleResize.bind(this);
        window.addEventListener("resize", this.handleResize);

        this.resize();
    }

    setResizeCallback(callback: () => void) {
        this.resizeCallback = callback;
    }

    private calculateSize() {
        this.canvas.width = window.innerWidth * this.devicePixelRatio;
        this.canvas.height = window.innerHeight * this.devicePixelRatio;

        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;

        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    }

    private handleResize() {
        this.calculateSize();

        if (this.resizeCallback) {
            this.resizeCallback();
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    }

    private resize() {
        this.calculateSize();
    }

    cssToCanvasPixels(value: number): number {
        return value * this.devicePixelRatio;
    }

    get cssWidth(): number {
        return window.innerWidth;
    }

    get cssHeight(): number {
        return window.innerHeight;
    }

    get centerX(): number {
        return this.cssWidth / 2;
    }

    get centerY(): number {
        return this.cssHeight / 2;
    }

    destroy() {
        window.removeEventListener("resize", this.handleResize);
    }
}
