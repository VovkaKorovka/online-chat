const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let userCount = 0;
let onlineUsers = []; // масив для імен користувачів

function broadcast(data, exclude) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== exclude) {
            client.send(JSON.stringify(data));
        }
    });
}

// Функція для оновлення всіх онлайн
function updateOnline() {
    const list = onlineUsers.slice(); // копія
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "online",
                onlineUsers: list
            }));
        }
    });
}

wss.on("connection", (ws) => {
    userCount++;
    ws.userName = `Особа-${userCount}`;
    onlineUsers.push(ws.userName);

    // Надсилаємо info самому клієнту
    ws.send(JSON.stringify({
        type: "init",
        user: ws.userName,
        onlineUsers: onlineUsers
    }));

    // Сповіщаємо всіх про нове підключення
    broadcast({
        type: "system",
        text: `${ws.userName} підключився`,
        onlineUsers: onlineUsers
    }, ws);

    // Оновлюємо список онлайн всім
    updateOnline();

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
        // видаляємо з onlineUsers
        onlineUsers = onlineUsers.filter(u => u !== ws.userName);

        broadcast({
            type: "system",
            text: `${ws.userName} вийшов`,
            onlineUsers: onlineUsers
        });

        updateOnline();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
});
