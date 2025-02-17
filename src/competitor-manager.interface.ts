import Character from "./character";
import GameState from "./game-state";

export default interface ICompetitorManager {
    initialize(gameState: GameState, characters: Character[]): void;
    addCompetitor(playerID: string | null, currentIdx: number | null): void;
    draw(): void;
    update(deltaTime: number): void;
    cleanup(): void;
    anyFinished(): boolean;
}
