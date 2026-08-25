const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { startBot, stopBot, activeBots } = require('./bot');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let sessionsData = [];

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

app.post('/api/start', async (req, res) => {
    const { sessionId, texts, nc, delay } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

    try {
        startBot(sessionId, texts, nc, delay, (log) => {
            broadcast({ type: 'log', sessionId, message: log });
        });
        res.json({ success: true, message: 'Bot started successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/stop', (req, res) => {
    const { sessionId } = req.body;
    stopBot(sessionId);
    broadcast({ type: 'log', sessionId, message: 'Bot stopped by user.' });
    res.json({ success: true, message: 'Bot stopped' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`UNNATNEWIG Panel running on port ${PORT}`);
});
