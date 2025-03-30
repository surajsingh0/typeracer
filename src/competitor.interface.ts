export default interface ICompetitor {
    setPlayerID(id: string): void;
    setCurrentIdx(idx: number): void;
    getID(): string;
    getPlayerID(): string;
    isFinished(): boolean;
    update(deltaTime: number): void;
    draw(): void;
}
