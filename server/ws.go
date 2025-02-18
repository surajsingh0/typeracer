package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type RoomManager struct {
	rooms map[string]*Hub
	sync.RWMutex
}

func NewRoomManager() *RoomManager {
	rm := &RoomManager{
		rooms: make(map[string]*Hub),
	}
	rm.StartCleanupTask()
	return rm
}

func (rm *RoomManager) GetHub(roomID string) *Hub {
	rm.Lock()
	defer rm.Unlock()

	if hub, exists := rm.rooms[roomID]; exists {
		return hub
	}

	newHub := newHub()
	newHub.roomID = roomID
	newHub.roomManager = rm
	go newHub.run()
	rm.rooms[roomID] = newHub
	log.Printf("Created new room: %s", roomID)
	return newHub
}

func (rm *RoomManager) RemoveHub(roomID string) {
	rm.Lock()
	defer rm.Unlock()

	hub, exists := rm.rooms[roomID]
	if !exists {
		return
	}

	hub.mu.RLock()
	isEmpty := len(hub.clients) == 0
	hub.mu.RUnlock()

	if isEmpty {
		log.Printf("Removing empty room: %s", roomID)
		delete(rm.rooms, roomID)
	} else {
		log.Printf("Room %s still has %d clients, not removing", roomID, len(hub.clients))
	}
}

func (rm *RoomManager) StartCleanupTask() {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			rm.cleanupEmptyRooms()
		}
	}()
}

func (rm *RoomManager) cleanupEmptyRooms() {
	rm.Lock()
	defer rm.Unlock()

	for roomID, hub := range rm.rooms {
		hub.mu.RLock()
		isEmpty := len(hub.clients) == 0
		hub.mu.RUnlock()

		if isEmpty {
			log.Printf("Cleanup: removing empty room: %s", roomID)
			delete(rm.rooms, roomID)
		}
	}
}

// Client represents a connected WebSocket client
type Client struct {
	conn *websocket.Conn
	send chan []byte
	hub  *Hub
	Player
}

type Player struct {
	id             string
	CurrentIdx     int
	CorrectChrsCnt int
	WPM            int
}

// Hub maintains the set of active clients
type Hub struct {
	roomID      string
	clients     map[*Client]bool
	roomManager *RoomManager
	clientsByID map[string]*Client
	mu          sync.RWMutex
	broadcast   chan []byte
	register    chan *Client
	unregister  chan *Client
}

func newHub() *Hub {
	return &Hub{
		broadcast:   make(chan []byte, 256),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		clients:     make(map[*Client]bool),
		clientsByID: make(map[string]*Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client %s registered in room %s", client.id, h.roomID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)

				if client.id != "" {
					delete(h.clientsByID, client.id)
					log.Printf("Client %s unregistered from room %s", client.id, h.roomID)

					msg, _ := json.Marshal(map[string]string{"type": "leave", "id": client.id})
					go func(message []byte) {
						select {
						case h.broadcast <- message:
						default:
							log.Printf("Failed to broadcast leave message for client %s", client.id)
						}
					}(msg)
				}

				if len(h.clients) == 0 {
					log.Printf("Room %s is now empty, scheduling cleanup", h.roomID)
					go func() {
						time.Sleep(time.Second)
						h.roomManager.RemoveHub(h.roomID)
					}()
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			var msgData struct {
				Type string `json:"type"`
				ID   string `json:"id"`
			}
			if err := json.Unmarshal(message, &msgData); err != nil {
				log.Printf("Error parsing broadcast message: %v", err)
				continue
			}
			senderID := msgData.ID

			h.mu.RLock()
			clients := make([]*Client, 0, len(h.clients))
			for client := range h.clients {
				clients = append(clients, client)
			}
			h.mu.RUnlock()

			for _, client := range clients {
				if client.id == senderID {
					continue
				}
				select {
				case client.send <- message:
				default:
					h.mu.Lock()
					if _, ok := h.clients[client]; ok {
						close(client.send)
						delete(h.clients, client)
						if client.id != "" {
							delete(h.clientsByID, client.id)
							log.Printf("Client %s removed due to blocked channel", client.id)
						}
					}
					h.mu.Unlock()
				}
			}
		}
	}
}

func (c *Client) sendErrorMessage(message string) {
	msg, _ := json.Marshal(map[string]string{"type": "error", "message": message})
	select {
	case c.send <- msg:
		time.Sleep(time.Second)
	default:
		log.Printf("Failed to send error message to client")
	}
	c.conn.Close()
}

func (c *Client) sendCurrentState() {
	c.hub.mu.RLock()
	players := make([]map[string]interface{}, 0, len(c.hub.clientsByID))
	for id, client := range c.hub.clientsByID {
		if id != c.id {
			players = append(players, map[string]interface{}{
				"id":             id,
				"currentIdx":     client.CurrentIdx,
				"correctChrsCnt": client.CorrectChrsCnt,
				"wpm":            client.WPM,
			})
		}
	}
	c.hub.mu.RUnlock()

	stateMsg, _ := json.Marshal(map[string]interface{}{
		"type":    "state",
		"players": players,
	})

	select {
	case c.send <- stateMsg:
	default:
		log.Printf("Failed to send state message to client %s", c.id)
	}
}

func (c *Client) broadcastJoin() {
	msg, _ := json.Marshal(map[string]interface{}{
		"type":           "join",
		"id":             c.id,
		"currentIdx":     c.CurrentIdx,
		"correctChrsCnt": c.CorrectChrsCnt,
		"wpm":            c.WPM,
	})

	select {
	case c.hub.broadcast <- msg:
	default:
		log.Printf("Failed to broadcast join message for client %s", c.id)
	}
}

func (c *Client) broadcastUpdate() {
	msg, _ := json.Marshal(map[string]interface{}{
		"type":           "update",
		"id":             c.id,
		"currentIdx":     c.CurrentIdx,
		"correctChrsCnt": c.CorrectChrsCnt,
		"wpm":            c.WPM,
	})

	select {
	case c.hub.broadcast <- msg:
	default:
		log.Printf("Failed to broadcast update message for client %s", c.id)
	}
}

func (c *Client) readPump() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in readPump: %v", r)
		}

		// Send unregister message and close connection in defer to ensure it happens
		if c.hub != nil {
			c.hub.unregister <- c
		}

		if c.conn != nil {
			c.conn.Close()
		}

		if c.id != "" {
			log.Printf("Client %s disconnected from room %s", c.id, c.hub.roomID)
		}
	}()

	c.conn.SetReadLimit(1024)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// Handle initial message
	_, msg, err := c.conn.ReadMessage()
	if err != nil {
		log.Printf("error reading initial message: %v", err)
		return
	}

	var initMsg struct {
		ID             string `json:"id"`
		CurrentIdx     int    `json:"currentIdx"`
		CorrectChrsCnt int    `json:"correctChrsCnt"`
		WPM            int    `json:"wpm"`
	}
	if err := json.Unmarshal(msg, &initMsg); err != nil {
		log.Printf("invalid initial message: %v", err)
		return
	}

	// Set client properties
	c.id = initMsg.ID
	c.CurrentIdx = initMsg.CurrentIdx
	c.CorrectChrsCnt = initMsg.CorrectChrsCnt

	// Validate and add client to hub
	c.hub.mu.Lock()
	currentPlayers := len(c.hub.clientsByID)
	if currentPlayers >= 11 {
		c.hub.mu.Unlock()
		c.sendErrorMessage("room is full")
		return
	}
	if _, exists := c.hub.clientsByID[c.id]; exists {
		c.hub.mu.Unlock()
		c.sendErrorMessage("duplicate ID")
		return
	}
	c.hub.clientsByID[c.id] = c
	c.hub.mu.Unlock()

	// Register client with hub
	c.hub.register <- c

	// Send initial state to client
	c.sendCurrentState()

	c.broadcastJoin()

	// Main message loop
	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var msgData struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(msg, &msgData); err != nil {
			log.Printf("Error parsing message type: %v", err)
			continue
		}

		switch msgData.Type {
		case "update":
			var update struct {
				Type           string `json:"type"`
				CurrentIdx     int    `json:"currentIdx"`
				CorrectChrsCnt int    `json:"correctChrsCnt"`
				WPM            int    `json:"wpm"`
			}
			if err := json.Unmarshal(msg, &update); err != nil {
				log.Printf("Error parsing update message: %v", err)
				continue
			}

			c.CurrentIdx = update.CurrentIdx
			c.CorrectChrsCnt = update.CorrectChrsCnt
			c.WPM = update.WPM
			c.broadcastUpdate()

		case "heartbeat", "ping":
			c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		default:
			log.Printf("Received unsupported message type: %s", msgData.Type)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(time.Second * 30)
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in writePump: %v", r)
		}

		ticker.Stop()
		if c.conn != nil {
			c.conn.Close()
		}

		if c.id != "" && c.hub != nil {
			log.Printf("WritePump ended for client %s in room %s", c.id, c.hub.roomID)
		}
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Channel closed, notify client
				c.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			_, err = w.Write(message)
			if err != nil {
				return
			}

			// Add queued messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				_, err := w.Write(<-c.send)
				if err != nil {
					return
				}
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func serveWs(roomManager *RoomManager, w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	roomID := query.Get("room")
	if roomID == "" {
		roomID = "default"
	}

	hub := roomManager.GetHub(roomID)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
		hub:  hub,
	}

	log.Printf("New client connected to room: %s", roomID)

	go client.writePump()
	go client.readPump()
}
