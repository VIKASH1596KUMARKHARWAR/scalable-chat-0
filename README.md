# WebSocket with Redis Pub/Sub for Scalable Room-Based Messaging

This project implements a **scalable, maintainable messaging system** using WebSockets and Redis Pub/Sub. The system supports multiple users subscribing to multiple rooms. Messages sent to a specific room are broadcasted to all users subscribed to that room.

---

## 🚀 Project Features

1. **Room-Based Messaging**  
   - Users can subscribe to specific rooms (e.g., `room1`).  
   - Messages sent to a room are delivered to all users subscribed to that room.  

2. **Redis Pub/Sub Model**  
   - **Publish Client**: Handles publishing messages to rooms.  
   - **Subscribe Client**: Listens for messages on rooms and forwards them to WebSocket clients.  

3. **WebSocket Integration**  
   - Provides real-time communication between users and the server.  
   - Manages dynamic subscriptions and unsubscriptions to rooms.  

---

## 🛠️ Implementation Details

### Redis Setup

1. Start the Redis server using Docker:  
   ```bash
   docker run -p 6379:6379 redis
   ```  

2. Access Redis CLI (if needed):  
   ```bash
   docker exec -it <container_id> redis-cli
   ```  

### Code Overview

#### Key Components:

1. **WebSocket Server**  
   - Listens for incoming WebSocket connections.  
   - Manages subscriptions and broadcasts messages to relevant clients.  

2. **Redis Clients**  
   - **Publisher**: Publishes messages to rooms when users send them.  
   - **Subscriber**: Listens for messages on rooms and forwards them to WebSocket connections.  

3. **Dynamic Room Management**  
   - Subscribes to a Redis channel only when the first user joins a room.  
   - Unsubscribes from a Redis channel when the last user leaves a room.  

---

## 📅 Example Workflow

1. **User Subscribes to a Room**:  
   - A WebSocket client sends a message of type `SUBSCRIBE` with the room ID.  
   - If it’s the first user in the room, the server subscribes to the Redis channel for that room.  

2. **User Unsubscribes from a Room**:  
   - A WebSocket client sends a message of type `UNSUBSCRIBE` with the room ID.  
   - If the last user leaves the room, the server unsubscribes from the Redis channel.  

3. **User Sends a Message to a Room**:  
   - A WebSocket client sends a message of type `sendMessage` with the room ID and content.  
   - The server publishes the message to the Redis channel for that room.  
   - All users subscribed to the room receive the message in real-time.

---

## 📊 Code Snippet

Here’s a simplified version of the WebSocket and Redis Pub/Sub integration:

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from "redis";

const publishClient = createClient();
publishClient.connect();

const subscribeClient = createClient();
subscribeClient.connect();

const wss = new WebSocketServer({ port: 8080 });

const subscriptions: {
    [key: string]: {
        ws: WebSocket,
        rooms: string[]
    }
} = {};

wss.on('connection', function connection(userSocket) {
    const id = randomId();
    subscriptions[id] = {
        ws: userSocket,
        rooms: []
    };

    userSocket.on('message', function message(data) {
        const parsedMessage = JSON.parse(data as unknown as string);

        if (parsedMessage.type === "SUBSCRIBE") {
            subscriptions[id].rooms.push(parsedMessage.room);
            if (oneUserSubscribedTo(parsedMessage.room)) {
                subscribeClient.subscribe(parsedMessage.room, (message) => {
                    const parsedMessage = JSON.parse(message);
                    Object.keys(subscriptions).forEach((userId) => {
                        const { ws, rooms } = subscriptions[userId];
                        if (rooms.includes(parsedMessage.roomId)) {
                            ws.send(parsedMessage.message);
                        }
                    });
                });
            }
        }

        if (parsedMessage.type === "UNSUBSCRIBE") {
            subscriptions[id].rooms = subscriptions[id].rooms.filter(x => x !== parsedMessage.room);
            if (lastPersonLeftRoom(parsedMessage.room)) {
                subscribeClient.unsubscribe(parsedMessage.room);
            }
        }

        if (parsedMessage.type === "sendMessage") {
            const message = parsedMessage.message;
            const roomId = parsedMessage.roomId;

            publishClient.publish(roomId, JSON.stringify({
                type: "sendMessage",
                roomId: roomId,
                message
            }));
        }
    });
});

function oneUserSubscribedTo(roomId: string) {
    let totalInterestedPeople = 0;
    Object.keys(subscriptions).map(userId => {
        if (subscriptions[userId].rooms.includes(roomId)) {
            totalInterestedPeople++;
        }
    });
    return totalInterestedPeople === 1;
}

function lastPersonLeftRoom(roomId: string) {
    let totalInterestedPeople = 0;
    Object.keys(subscriptions).map(userId => {
        if (subscriptions[userId].rooms.includes(roomId)) {
            totalInterestedPeople++;
        }
    });
    return totalInterestedPeople === 0;
}

function randomId() {
    return Math.random().toString(36).substring(7);
}
```

---

## 🔧 Key Points
- **Redis Pub/Sub** ensures scalability for handling multiple rooms and users.
- WebSocket integration provides real-time messaging.
- Subscribing and unsubscribing dynamically optimizes system resources.

---

Happy Coding! 🌟

