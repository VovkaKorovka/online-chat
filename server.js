const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let userCount = 0;

function broadcast(data, exclude) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== exclude) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on("connection", (ws) => {
    userCount++;
    ws.userName = `Особа-${userCount}`;

    // Надсилаємо інформацію самому клієнту
    ws.send(JSON.stringify({
        type: "init",
        user: ws.userName,
        online: wss.clients.size
    }));

    // Сповіщаємо всіх про нове підключення
    broadcast({
        type: "system",
        text: `${ws.userName} підключився`,
        online: wss.clients.size
    }, ws);

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
            }, ws);
        }
    });

    ws.on("close", () => {
        broadcast({
            type: "system",
            text: `${ws.userName} вийшов`,
            online: wss.clients.size
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
});
