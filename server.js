const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on("connection", (ws) => {
    // Ім’я від клієнта або fallback
    ws.userName = ws.initialName || `Особа-${wss.clients.size+1}`;

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

    ws.isTyping = false;

    ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());

        if(msg.type === "chat") {
            ws.isTyping = false;
            broadcast({
                type: "chat",
                user: ws.userName,
                text: msg.text
            });
        }

        if(msg.type === "typing") {
            ws.isTyping = true;
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

        broadcast({
            type: "removeTyping",
            user: ws.userName
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
});
