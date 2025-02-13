import TypeRacer from "./type-racer";
import { createCharactersFromText } from "./character";
import Cursor from "./cursor";

const gameLoop = (
    typeRacer: TypeRacer,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    typeRacer.update();
    typeRacer.draw();

    requestAnimationFrame(() => gameLoop(typeRacer, ctx, canvas));
};

const main = () => {
    const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
    if (!canvas) {
        throw "canvas element not found";
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw "failed to get 2d context";
    }

    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;

    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    ctx.scale(devicePixelRatio, devicePixelRatio);

    const fontSize = 30;
    const fontFamily = "monospace";
    const text =
        "Coding is an art, a science, and a craft. It requires creativity, logical thinking, and attention to detail. Learning to code can open up a world of possibilities, from building websites and apps to creating games and solving complex problems. The journey may be challenging at times, but the rewards are well worth the effort.";
    const padding = 40;

    const characters = createCharactersFromText(
        ctx,
        text,
        fontSize,
        fontFamily,
        window.innerWidth,
        window.innerHeight,
        padding
    );

    const cursor = new Cursor(
        ctx,
        padding - 2,
        (window.innerHeight - fontSize * 1.2) / 2,
        "rgb(177, 177, 177)",
        fontSize
    );

    const typeRacer = new TypeRacer(characters, cursor);

    requestAnimationFrame(() => gameLoop(typeRacer, ctx, canvas));
};

try {
    main();
} catch (error) {
    console.error(error);
}
