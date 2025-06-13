import Fastify from "fastify";
import cors from "@fastify/cors"
import { createServer } from "http";
import { Server } from "socket.io";
import jwtPlugin from "./plugins/jwt.js"
import authRoutes from "./routes/auth.js"
import quizes from "./routes/quizes.js"
import 'dotenv/config.js'
import report from "./routes/reports.js";
import tags from "./routes/tags.js";
import comment from "./routes/comments.js";
import setupSocket from "./multiplayer.js";
import { existsSync, mkdir } from "fs";
import fastifyStatic from "@fastify/static";
import { join } from "path";

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
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"]
})


fastify.register(quizes)
fastify.register(report)
fastify.register(tags)
fastify.register(comment)

fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});

if (!existsSync(join(process.cwd(), 'public')))
  mkdir(join(process.cwd(), 'public'), { recursive: true }, (err) => {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  }
)
fastify.register(fastifyStatic, {
  root: join(process.cwd(), 'public'),
  prefix: '/public/'
})

fastify.ready((err) => {
  if (err) throw err;
  server.listen(3000, '0.0.0.0', () => {
    console.log("Server listening on http://*:3000");
  });
});