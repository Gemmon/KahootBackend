import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyRequest, FastifyReply } from 'fastify';



export default fp(async( fastify) => {
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || "supersecret"
    })
    
    // wlasny middleware do autoryzacji
    fastify.decorate("authenticate", async function(request: FastifyRequest, reply: FastifyReply) {
        try{
            await request.jwtVerify()
        }catch(err){
            reply.status(401).send({message:"Unauthorized"})
        }
    })
})