import Fastify from "fastify";
import cors from "@fastify/cors"
import { createServer } from "http";
import { Server } from "socket.io";

import auth from "./routes/auth.js";
import commentRoutes from "./routes/comments.js";

var server: ReturnType<typeof createServer>;
var io;

const fastify = Fastify({
  logger: true,
  serverFactory: (handler) => {
    server = createServer(handler);
    io = new Server(server, {  });

    io.on("connection", (socket) => {
      console.log('User connected');
    });
    return server;
  }
})

fastify.register(cors, {
  origin: true
})

fastify.register(auth)
fastify.register(commentRoutes)

fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});

fastify.ready((err) => {
  if (err) throw err;
  server.listen(3000, () => {
    console.log("Server listening on http://localhost:3000");
  });
});