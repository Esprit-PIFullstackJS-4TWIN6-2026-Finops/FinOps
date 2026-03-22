import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { config } from "./config.js";
import { initRealtime } from "./realtime.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientUrl, credentials: true },
});

initRealtime(io);

server.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});

