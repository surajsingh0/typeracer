import CanvasManager from "./canvas-manager";
import Character from "./character";
import Cursor from "./cursor";
import GameState from "./game-state";
import { calculateWPM, calculateElapsedTime, calculateAccuracy } from "./utils";
import ICompetitorManager from "./competitor-manager.interface";
import { WSClient } from "./ws-client";
import { PlayerInfo, ServerMessage } from "./message";
import TypeRacerMetrics from "./metrics";

export default class TypeRacer {
    private canvasManager: CanvasManager;
    private gameState: GameState;
    private characters: Character[];
    private curCharIdx = 0;
    private isStarted = false;
    private myCursor: Cursor;

    private correctChrsCnt = 0;
    private startTime: number;
    private wpm = 0;
    private accuracy = 0;

    private updateInterval: number;
    private lastSentTime = 0;
    private readonly throttleDelay = 100;

    private lastUpdateTimestamp: number = performance.now();
    private competitorManager: ICompetitorManager;

    private wsClient: WSClient;
    private playerID: string;
    private clientID: string;
    // private statsFontSize = 16;

    constructor(
        canvasManager: CanvasManager,
        gameState: GameState,
        characters: Character[],
        myCursor: Cursor,
        competitorManager: ICompetitorManager,
        wsClient: WSClient,
        playerDisplayName: string
    ) {
        this.canvasManager = canvasManager;
        this.gameState = gameState;
        this.characters = characters;
        this.myCursor = myCursor;
        myCursor.disappear();

        this.startTime = Date.now();

        this.competitorManager = competitorManager;
        this.competitorManager.initialize(gameState, characters);

        this.wsClient = wsClient;
        this.playerID = playerDisplayName;
        this.clientID = `temp_${Math.random().toString(36).substring(2, 9)}`;

        this.gameState.registerPlayer(this.clientID, this.playerID);

        this.wsClient.on("message", (message: ServerMessage) => {
            switch (message.type) {
                case "state":
                    message.players?.forEach((player: PlayerInfo) => {
                        if (player.id !== this.clientID) {
                            this.competitorManager.addCompetitor(
                                player.id,
                                player.playerID
                            );
                            const competitorMetrics: TypeRacerMetrics = {
                                id: player.id,
                                playerID: player.playerID || player.id,
                                wpm: player.wpm,
                                accuracy: player.accuracy || 0,
                            };
                            this.gameState.updateCompetitorMetric(
                                competitorMetrics
                            );
                        }
                    });
                    break;
                case "assign_id":
                    if (message.id && this.clientID !== message.id) {
                        console.log(
                            `Received assigned Client ID: ${message.id}`
                        );
                        this.gameState.removeParticipantMetric(this.clientID);
                        this.clientID = message.id;
                        this.gameState.registerPlayer(
                            this.clientID,
                            this.playerID
                        );
                    }
                    break;
                case "update":
                    if (message.id && message.id !== this.clientID) {
                        this.competitorManager.addCompetitor(
                            message.id,
                            message.playerID
                        );

                        const updateMetrics: TypeRacerMetrics = {
                            id: message.id,
                            playerID: message.playerID || message.id,
                            wpm: message.wpm,
                            accuracy: message.accuracy || 0,
                        };
                        this.gameState.updateCompetitorMetric(updateMetrics);
                    }
                    break;
                case "leave":
                    if (message.id && message.id !== this.clientID) {
                        this.gameState.removeParticipantMetric(message.id);
                        this.competitorManager.removeCompetitor(message.id);
                    }
                    break;
            }
        });

        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener("keydown", this.handleKeyDown);

        this.updateInterval = setInterval(() => {
            this.updateStats();
            this.gameState.updateWpm(this.clientID, this.wpm);
            this.gameState.updateAccuracy(this.clientID, this.accuracy);
            this.sendUpdates();
        }, 1000);

        this.updateStatsLayout();
    }

    private updateStats() {
        if (!this.isStarted || this.gameState.isOver) return;

        this.wpm = calculateWPM(
            this.correctChrsCnt,
            calculateElapsedTime(this.startTime)
        );
        this.accuracy = calculateAccuracy(this.correctChrsCnt, this.curCharIdx);
    }

    private handleKeyDown(event: KeyboardEvent) {
        if (
            (event.key.length > 1 && event.key !== "Backspace") ||
            this.gameState.isOver
        ) {
            return;
        }

        const typedChar = event.key;
        const curChar = this.characters[this.curCharIdx];

        if (this.curCharIdx === 0 && !this.isStarted) {
            this.startTime = Date.now();
            this.isStarted = true;
        }

        if (typedChar === "Backspace") {
            if (this.curCharIdx === 0) {
                return;
            }
            this.curCharIdx--;
            if (this.characters[this.curCharIdx].currentState === "correct") {
                this.correctChrsCnt--;
            }
            this.characters[this.curCharIdx].currentState = "neutral";
            if (this.curCharIdx === 0) {
                this.myCursor.disappear();
            } else {
                this.myCursor.move(this.characters[this.curCharIdx - 1]);
            }
        } else {
            const isCorrect = typedChar === curChar.char;
            this.correctChrsCnt += isCorrect ? 1 : 0;
            curChar.currentState = isCorrect ? "correct" : "incorrect";
            this.curCharIdx++;
            this.myCursor.move(curChar);

            if (this.curCharIdx === this.characters.length) {
                this.end();
                return;
            }
        }

        this.updateStats();
        this.sendUpdates();
    }

    private sendUpdates(isTrottled = true) {
        const now = Date.now();
        if (now - this.lastSentTime < this.throttleDelay && isTrottled) {
            return;
        }
        this.lastSentTime = now;

        this.wsClient.send({
            id: this.clientID,
            type: "update",
            currentIdx: this.curCharIdx,
            correctChrsCnt: this.correctChrsCnt,
            wpm: this.wpm,
        } as PlayerInfo);
    }

    draw() {
        // const { ctx } = this.canvasManager;

        this.characters.forEach((char) => {
            char.draw();
        });
        this.myCursor.draw();
        this.competitorManager.draw();
    }

    update() {
        if (this.gameState.isOver) return;
        if (this.competitorManager.anyFinished()) {
            this.end();
            return;
        }

        const now = performance.now();
        const deltaTime = now - this.lastUpdateTimestamp;
        this.lastUpdateTimestamp = now;

        this.competitorManager.update(deltaTime);
    }

    private end() {
        this.updateStats();
        this.gameState.updateWpm(this.clientID, this.wpm);
        this.gameState.updateAccuracy(this.clientID, this.accuracy);
        this.sendUpdates(false);
        this.gameState.isOver = true;
        this.isStarted = false;
        this.cleanup();
    }

    private cleanup() {
        document.removeEventListener("keypress", this.handleKeyDown);
        clearInterval(this.updateInterval);
    }

    updateStatsLayout() {
        const width = this.canvasManager.cssWidth;
        if (width < 600) {
            // this.statsFontSize = 12;
        } else if (width < 900) {
            // this.statsFontSize = 14;
        } else {
            // this.statsFontSize = 16;
        }
    }

    handleResize() {
        this.updateStatsLayout();
        console.log("TypeRacer handling resize (Stats layout updated)");
    }

    updateCharacters(newCharacters: Character[]) {
        const wasStarted = this.isStarted;
        const oldCharacters = this.characters;
        const oldCurCharIdx = this.curCharIdx;
        const oldCorrectChrsCnt = this.correctChrsCnt;
        const oldStartTime = this.startTime;

        this.characters = newCharacters;

        if (wasStarted) {
            for (
                let i = 0;
                i < oldCurCharIdx && i < this.characters.length;
                i++
            ) {
                this.characters[i].currentState = oldCharacters[i].currentState;
            }

            this.curCharIdx = oldCurCharIdx;
            this.correctChrsCnt = oldCorrectChrsCnt;
            this.isStarted = wasStarted;
            this.startTime = oldStartTime;

            if (
                this.curCharIdx > 0 &&
                this.curCharIdx < this.characters.length
            ) {
                this.myCursor.move(this.characters[this.curCharIdx - 1]);
            } else if (this.curCharIdx === 0) {
                this.myCursor.disappear();
            }
        } else {
            this.curCharIdx = 0;
            this.correctChrsCnt = 0;
            this.isStarted = false;
            this.wpm = 0;
            this.accuracy = 0;
            this.startTime = Date.now();
            this.myCursor.reset();
            this.myCursor.disappear();
        }

        this.sendUpdates(false);
    }
}
