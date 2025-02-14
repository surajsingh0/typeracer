import Character from "./character";

export interface ICompetitorManager {
    initialize(characters: Character[]): void;
    addCompetitor(): void;
    draw(): void;
    update(deltaTime: number): void;
    cleanup(): void;
    anyFinished(): boolean;
}
