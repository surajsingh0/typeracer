export default class Character {
    private ctx: CanvasRenderingContext2D;
    char: string;
    x: number;
    y: number;
    width: number;
    currentState: "neutral" | "correct" | "incorrect" = "neutral";

    constructor(
        ctx: CanvasRenderingContext2D,
        char: string,
        x: number,
        y: number,
        width: number
    ) {
        this.ctx = ctx;
        this.char = char;
        this.x = x;
        this.y = y;
        this.width = width;
    }

    draw() {
        switch (this.currentState) {
            case "neutral":
                this.ctx.fillStyle = "rgb(230, 230, 230)";
                break;
            case "correct":
                this.ctx.fillStyle = "green";
                break;
            case "incorrect":
                this.ctx.fillStyle = "red";
                break;
        }
        this.ctx.fillText(this.char, this.x, this.y, this.width);
    }
}

export const createCharactersFromText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
    fontFamily: string,
    canvasWidth: number,
    canvasHeight: number,
    padding: number = 20,
    charSpacing: number = 2.5,
    lineHeight: number = fontSize * 1.2
): Character[] => {
    ctx.font = `${fontSize}px ${fontFamily}`;

    const characters: Character[] = [];
    const words = text.split(" ");

    const totalHeight = calculateTextBlockHeight(
        ctx,
        words,
        canvasWidth,
        padding,
        lineHeight
    );

    const startY = (canvasHeight - totalHeight) / 2;

    let currentX = padding;
    let currentY = startY;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordWidth = ctx.measureText(word).width;

        if (wordWidth > canvasWidth - 2 * padding) {
            console.warn(
                `Word "${word}" is too long to fit within the canvas width.`
            );
            continue;
        }

        if (currentX + wordWidth > canvasWidth - padding) {
            currentX = padding;
            currentY += lineHeight;
        }

        for (let j = 0; j < word.length; j++) {
            const char = word[j];
            const charWidth = ctx.measureText(char).width;

            const character = new Character(
                ctx,
                char,
                currentX,
                currentY,
                charWidth
            );
            characters.push(character);

            currentX += charWidth + charSpacing;
        }

        if (i < words.length - 1) {
            const spaceWidth = ctx.measureText(" ").width;
            const spaceChar = new Character(
                ctx,
                " ",
                currentX,
                currentY,
                spaceWidth
            );
            characters.push(spaceChar);
            currentX += spaceWidth + charSpacing;
        }
    }

    return characters;
};

const calculateTextBlockHeight = (
    ctx: CanvasRenderingContext2D,
    words: string[],
    canvasWidth: number,
    padding: number,
    lineHeight: number
): number => {
    let currentX = padding;
    let totalHeight = lineHeight;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordWidth = ctx.measureText(word).width;

        if (wordWidth > canvasWidth - 2 * padding) {
            console.warn(
                `Word "${word}" is too long to fit within the canvas width.`
            );
            continue;
        }

        if (currentX + wordWidth > canvasWidth - padding) {
            currentX = padding;
            totalHeight += lineHeight;
        }

        currentX += wordWidth;
        if (i < words.length - 1) {
            const spaceWidth = ctx.measureText(" ").width;
            currentX += spaceWidth;
        }
    }

    return totalHeight;
};
