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
    // prehandler
    fastify.post("/tags", async(request, reply) => {
        const tagData = request.body as TagRequestBody

        const tag = await createTag(tagData.name);
        if(tag){
            reply.status(201).send({ result:'tag added', data:tag})
        } else {
            reply.status(500).send({ message:'could not add tag'})
        }
    })

    // Add {preHandler: [fastify.authenticate], schema}
    fastify.get("/tags", async(request, reply) => {
        const query = request.query as {
            limit?: string,
            offset?: string
        }
        const limit = Number(query.limit)
        const offset = Number(query.offset)
        const tags = await getTags(limit, offset);
        reply.status(200).send({ items_count: tags.length, data: tags })
    })
}