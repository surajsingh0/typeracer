type WSEventCallback<T = unknown> = (data: T) => void;
type WSErrorCallback = (error: Event) => void;

interface WebSocketConfig {
    url: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
}

export class WSClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private isExplicitClose = false;
    private heartbeatTimer?: number;
    private eventListeners = new Map<string, Set<Function>>();
    private pingInterval: number | null = null;

    constructor(private config: WebSocketConfig) {
        this.config = {
            reconnectInterval: 3000,
            maxReconnectAttempts: 5,
            heartbeatInterval: 15000,
            ...config,
        };
    }

    // Public API
    public connect(): void {
        if (this.ws) return;

        this.isExplicitClose = false;
        this.ws = new WebSocket(this.config.url);
        this.setupEventListeners();
        this.setupPingInterval();
    }

    public disconnect(): void {
        this.isExplicitClose = true;
        this.ws?.close();
        this.cleanup();
    }

    public send<T = unknown>(data: T): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error("WebSocket not connected");
            return;
        }

        const payload = typeof data === "string" ? data : JSON.stringify(data);
        this.ws.send(payload);
    }

    public on<T = unknown>(
        event: "message",
        callback: WSEventCallback<T>
    ): void;
    public on(event: "open" | "close", callback: () => void): void;
    public on(event: "error", callback: WSErrorCallback): void;
    public on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)?.add(callback);
    }

    public off(event: string, callback: Function): void {
        this.eventListeners.get(event)?.delete(callback);
    }

    private setupEventListeners(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.emit("open");
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.emit("message", data);
            } catch (error) {
                this.emit("message", event.data);
            }
        };

        this.ws.onclose = () => {
            this.cleanup();
            this.emit("close");

            if (
                !this.isExplicitClose &&
                this.reconnectAttempts < this.config.maxReconnectAttempts!
            ) {
                setTimeout(
                    () => this.reconnect(),
                    this.config.reconnectInterval
                );
            }
        };

        this.ws.onerror = (error) => {
            this.emit("error", error);
            this.ws?.close();
        };
    }

    private setupPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.pingInterval = window.setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: "ping" }));
            } else {
                this.reconnect();
            }
        }, 30000);
    }

    private emit(event: string, ...args: any[]): void {
        this.eventListeners.get(event)?.forEach((callback) => {
            try {
                callback(...args);
            } catch (err) {
                console.error(`Error in ${event} handler:`, err);
            }
        });
    }

    private reconnect(): void {
        this.reconnectAttempts++;
        this.connect();
    }

    private startHeartbeat(): void {
        this.heartbeatTimer = window.setInterval(() => {
            this.send({ type: "heartbeat", timestamp: Date.now() });
        }, this.config.heartbeatInterval);
    }

    private cleanup(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws = null;
        }
    }
}
