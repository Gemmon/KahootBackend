import type { FastifyInstance } from "fastify";
import { sha256 } from "../functions.js";
import { login } from "../db.js";

export default async function routes(fastify: FastifyInstance, options: any) {
  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const user = await login(email, password);
    if (user) {
      reply.send({ result: 'ok', data: user });
    } else {
      reply.status(401).send({ message: "Invalid credentials" });
    }
  });
}