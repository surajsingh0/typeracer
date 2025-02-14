import App from "./app";

const main = () => {
    try {
        const canvas = document.getElementById(
            "main-canvas"
        ) as HTMLCanvasElement;
        if (!canvas) throw new Error("Canvas element not found");

        const app = new App(canvas);
        app.start();

        window.addEventListener("unload", () => app.destroy());
    } catch (error) {
        console.error("Failed to initialize app:", error);
    }
};

main();
