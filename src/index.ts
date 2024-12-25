import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from "redis"

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
} = {

}

// setInterval(() => {
//     console.log(subscriptions);
// }, 5000);


wss.on('connection', function connection(userSocket) {
    const id = randomId();
    subscriptions[id] = {
        ws: userSocket,
        rooms: []
    }

    userSocket.on('message', function message(data) {
        const parsedMessage = JSON.parse(data as unknown as string);
        if (parsedMessage.type === "SUBSCRIBE") {
            subscriptions[id].rooms.push(parsedMessage.room);
            if (oneUserSubscribedTo(parsedMessage.room)) {
                console.log("subscribing on the pub sub to room " + parsedMessage.room);
                subscribeClient.subscribe(parsedMessage.room, (message) => {
                    const parsedMessage = JSON.parse(message);
                    Object.keys(subscriptions).forEach((userId) => {
                        const { ws, rooms } = subscriptions[userId];
                        if (rooms.includes(parsedMessage.roomId)) {
                            ws.send(parsedMessage.message);
                        }
                    })
                })
            }
        }

        if (parsedMessage.type === "UNSUBSCRIBE") {
            subscriptions[id].rooms = subscriptions[id].rooms.filter(x => x !== parsedMessage.room)
            if (lastPersonLeftRoom(parsedMessage.room)) {
                console.log("unsubscribing from pub sub on room" + parsedMessage.room);
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
            }))
        }
    });

});

function oneUserSubscribedTo(roomId: string) {
    let totalInterestedPeople = 0;
    Object.keys(subscriptions).map(userId => {
        if (subscriptions[userId].rooms.includes(roomId)) {
            totalInterestedPeople++;
        }
    })
    if (totalInterestedPeople == 1) {
        return true;
    }
    return false;
}

function lastPersonLeftRoom(roomId: string) {
    let totalInterestedPeople = 0;
    Object.keys(subscriptions).map(userId => {
        if (subscriptions[userId].rooms.includes(roomId)) {
            totalInterestedPeople++;
        }
    })
    if (totalInterestedPeople == 0) {
        return true;
    }
    return false;
}

function randomId() {
    return Math.random();
}


// docker run -p 6379:6379 redis

// docker exec -it b5511954387a  redis-cli


//suppose if their is multiple user in multiple room and subscribed to any particular room, suppose room1.SO whenever any msg willl be send to room1, it will be broadcasted to all the user who are subscribed to room


//since woring on the scalabe and maintainable code, so we are using redis pub/sub model for this purpose and using the two clients one for each to publish and other to subscribe. 