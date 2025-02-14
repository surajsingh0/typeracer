export default interface ICompetitor {
    isFinished(): boolean;
    update(deltaTime: number): void;
    draw(): void;
}
