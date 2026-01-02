const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let userCount = 0;

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on("connection", (ws) => {
    userCount++;
    ws.userName = `Особа-${userCount}`;

    ws.send(JSON.stringify({
        type: "init",
        user: ws.userName,
        online: wss.clients.size
    }));

    broadcast({
        type: "system",
        text: `${ws.userName} підключився`,
        online: wss.clients.size
    });

    ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.type === "chat") {
            broadcast({
                type: "chat",
                user: ws.userName,
                text: msg.text
            });
        }

        if (msg.type === "typing") {
            broadcast({
                type: "typing",
                user: ws.userName
            });
        }
    });

    ws.on("close", () => {
        broadcast({
            type: "system",
            text: `${ws.userName} вийшов`,
            online: wss.clients.size - 1
        });
    });
});

server.listen(3000, () => {
    console.log("Сервер працює: http://localhost:3000");
});
