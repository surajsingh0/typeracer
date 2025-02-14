import Character from "./character";

export default interface ICompetitorManager {
    initialize(characters: Character[]): void;
    addCompetitor(): void;
    draw(): void;
    update(deltaTime: number): void;
    cleanup(): void;
    anyFinished(): boolean;
}
