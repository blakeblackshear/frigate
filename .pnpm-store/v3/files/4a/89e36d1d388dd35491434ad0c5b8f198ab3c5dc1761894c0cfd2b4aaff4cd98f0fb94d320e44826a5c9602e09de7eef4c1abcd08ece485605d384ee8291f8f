/**
 * This is a simple example server, mostly here for demonstration
 * purposes.
 * The subfolders in this directory contain actual client code with
 * supporting tests.
 **/

const WebSocket = require("ws");

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

server.on("connection", function connection(ws, req) {
  ws.on("message", function incoming(message) {
    console.log(`[received] ${message}`);
    ws.send(`[echo] ${message}`);
  });

  const remoteAddress = req.connection.remoteAddress;
  console.log(`[connected] Client at ${remoteAddress}`);
  ws.send(`Hello ${remoteAddress}`);
});

console.log(`[start] Starting echo server on port ${PORT}.`);
