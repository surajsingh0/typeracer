import Character from "./character";
import Cursor from "./cursor";

export default class TypeRacer {
    private characters: Character[];
    private curCharIdx: number;
    private cursor: Cursor;

    constructor(characters: Character[], cursor: Cursor) {
        this.characters = characters;
        this.curCharIdx = 0;
        this.cursor = cursor;
        cursor.disappear();

        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener("keydown", this.handleKeyDown);
    }

    private handleKeyDown(event: KeyboardEvent) {
        if (event.key.length > 1 && event.key !== "Backspace") {
            return;
        }

        const typedChar = event.key;
        const curChar = this.characters[this.curCharIdx];

        if (typedChar === "Backspace") {
            if (this.curCharIdx === 0) {
                return;
            }
            this.curCharIdx--;
            this.characters[this.curCharIdx].currentState = "neutral";
            if (this.curCharIdx === 0) {
                this.cursor.disappear();
            } else {
                this.cursor.move(this.characters[this.curCharIdx - 1]);
            }
        } else {
            curChar.currentState =
                typedChar === curChar.char ? "correct" : "incorrect";
            this.curCharIdx++;
            this.cursor.move(curChar);

            if (this.curCharIdx === this.characters.length) {
                this.cleanup();
                return;
            }
        }
    }

    draw() {
        this.characters.forEach((char) => {
            char.draw();
        });
        this.cursor.draw();
    }

    update() {}

    private cleanup() {
        document.removeEventListener("keypress", this.handleKeyDown);
    }
}
