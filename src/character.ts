import CanvasManager from "./canvas-manager";

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
        this.ctx.fillText(this.char, this.x, this.y);
    }
}

export const createCharactersFromText = (
    canvasManager: CanvasManager,
    text: string,
    fontSize: number,
    fontFamily: string,
): Character[] => {
    const { ctx, cssWidth, cssHeight } = canvasManager;
    const horizontalPadding = cssWidth * 0.05;
    const maxLineWidth = cssWidth - 2 * horizontalPadding;
    const charSpacing = fontSize * 0.15;
    const lineHeightMultiplier = 1.4;
    const lineHeight = fontSize * lineHeightMultiplier;

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = "bottom";

    const characters: Character[] = [];
    const words = text.split(" ");

    const linesInfo = calculateLines(ctx, words, maxLineWidth, charSpacing);
    const totalHeight = linesInfo.length * lineHeight;
    const raceTrackHeight = cssHeight * 0.15;
    const startY = raceTrackHeight + lineHeight;

    let currentX = horizontalPadding;
    let currentY = startY;

    for (const line of linesInfo) {
        currentX = horizontalPadding;
        const wordsInLine = line.split(' ');
        for(const word of wordsInLine) {
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
             if (word !== wordsInLine[wordsInLine.length - 1]) {
                const spaceWidth = ctx.measureText(" ").width;
                const spaceChar = new Character(ctx, " ", currentX, currentY, spaceWidth);
                characters.push(spaceChar);
                currentX += spaceWidth + charSpacing;
             }
        }
        currentY += lineHeight;
    }

    return characters;
};

const calculateLines = (
    ctx: CanvasRenderingContext2D,
    words: string[],
    maxLineWidth: number,
    charSpacing: number
): string[] => {
    const lines: string[] = [];
    let currentLine = "";
    let currentX = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let wordWidth = 0;
        for(const char of word) {
            wordWidth += ctx.measureText(char).width + charSpacing;
        }
        wordWidth -= charSpacing;

        const spaceWidth = currentLine === "" ? 0 : ctx.measureText(" ").width + charSpacing;

        if (currentX + spaceWidth + wordWidth > maxLineWidth && currentLine !== "") {
            lines.push(currentLine);
            currentLine = word;
            currentX = wordWidth;
        } else {
            currentLine += (currentLine === "" ? "" : " ") + word;
            currentX += spaceWidth + wordWidth;
        }
    }
    lines.push(currentLine);

    return lines;
};
