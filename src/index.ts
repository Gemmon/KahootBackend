import Fastify from "fastify";
import cors from "@fastify/cors"
import { createServer } from "http";
import { Server } from "socket.io";
import jwtPlugin from "./plugins/jwt.js"
import authRoutes from "./routes/auth.js"
import quizes from "./routes/quizes.js"
import 'dotenv/config.js'
import report from "./routes/reports.js";
import setupSocket from "./multiplayer.js";

var server: ReturnType<typeof createServer>;
var io: Server;

const fastify = Fastify({
  logger: true,
  serverFactory: (handler) => {
    server = createServer(handler);
    io = new Server(server, { connectionStateRecovery: {} });
    setupSocket(io);

    return server;
  }
})

fastify.register(jwtPlugin)
fastify.register(authRoutes)

fastify.register(cors, {
  origin: true
})


fastify.register(quizes)
fastify.register(report)

fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});

fastify.ready((err) => {
  if (err) throw err;
  server.listen(3000, '0.0.0.0', () => {
    console.log("Server listening on http://*:3000");
  });
});