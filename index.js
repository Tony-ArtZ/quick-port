const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const uuid = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const tunnels = new Map();

app.use(express.raw({ type: "*/*" }));

// Middleware to handle tunneling based on path
app.use("/tunnel/:tunnelId", (req, res) => {
  const tunnelId = req.params.tunnelId;
  const tunnel = tunnels.get(tunnelId);

  if (!tunnel) {
    return res.status(404).send("Tunnel not found");
  }

  const requestId = uuid.v4();

  tunnel.emit("request", {
    id: requestId,
    method: req.method,
    path: req.path.replace(`/tunnel/${tunnelId}`, ""),
    headers: req.headers,
    body: req.body,
  });

  tunnel.once(`response:${requestId}`, (response) => {
    res.status(response.status).set(response.headers).send(response.body);
  });
});

// Handle WebSocket connections from clients
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("register", (tunnelId) => {
    console.log(`Registering tunnel: ${tunnelId}`);
    tunnels.set(tunnelId, socket);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    for (const [tunnelId, tunnelSocket] of tunnels.entries()) {
      if (tunnelSocket === socket) {
        tunnels.delete(tunnelId);
        console.log(`Unregistered tunnel: ${tunnelId}`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
