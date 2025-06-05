import { FastifyInstance } from "fastify";
import { getTags, createTag } from "../db.js";

export interface TagRequestBody {
    name: string
}

const schema = {
    body: {
        type: 'object',
        properties: {
            name: { type: 'string'},
        },
        required: ['name'],
        additionalProperties: false
    }
}

export default async function routes(fastify: FastifyInstance, options: any) {
    fastify.post("/tags", { preHandler: [fastify.authenticate], schema }, async(request, reply) => {
        const tagData = request.body as TagRequestBody  

        const newTag = await createTag(tagData.name);
        if(newTag){
            reply.status(201).send({ result:'Tag added', data: newTag })
        } else if(newTag === undefined) {
            reply.status(409).send({ message:'Tag already exists' })
        } else {
            reply.status(500).send({ message:'Could not add tag' })
        }
    })

    fastify.get("/tags", { preHandler: [fastify.authenticate] }, async(request, reply) => {
        const query = request.query as {
            limit?: string,
            offset?: string
        }
        const limit = Number(query.limit);
        const offset = Number(query.offset)

        const tags = await getTags(limit, offset);

        reply.status(200).send({ data: tags })
    })
}
