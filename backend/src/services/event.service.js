// Real-time Event Service for Server-Sent Events (SSE)
const clients = new Map(); // userId -> Set of res objects

function addClient(userId, res) {
    if (!userId) return;
    const key = userId.toString();
    if (!clients.has(key)) {
        clients.set(key, new Set());
    }
    clients.get(key).add(res);

    res.on("close", () => {
        removeClient(key, res);
    });
}

function removeClient(userId, res) {
    const key = userId.toString();
    if (clients.has(key)) {
        const userClients = clients.get(key);
        userClients.delete(res);
        if (userClients.size === 0) {
            clients.delete(key);
        }
    }
}

function notifyUser(userId, data) {
    if (!userId) return;
    const key = userId.toString();
    const userClients = clients.get(key);
    if (userClients && userClients.size > 0) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        userClients.forEach((client) => {
            try {
                client.write(payload);
            } catch (err) {
                console.error("SSE write error:", err.message);
            }
        });
    }
}

function broadcastEvent(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach((userClients) => {
        userClients.forEach((client) => {
            try {
                client.write(payload);
            } catch (err) {
                console.error("SSE broadcast error:", err.message);
            }
        });
    });
}

module.exports = {
    addClient,
    removeClient,
    notifyUser,
    broadcastEvent
};
