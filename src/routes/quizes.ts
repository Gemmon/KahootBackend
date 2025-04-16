import { FastifyInstance } from "fastify";
import { addQuiz, getQuizes } from "../db.js";

export interface QuizRequestBody{
    title: string,
    description: string,
    created_by: number,
    is_public: boolean
}

const opts = {
    schema: {
        body: {
            type: 'object',
            properties: {
                title: { type: 'string'},
                description: { type: 'string'},
                created_by: { type: 'integer'},
                is_public: { type: 'boolean'},
            },
            required: ['title', 'description', 'created_by', 'is_public']
        }
    }
}


export default async function routes(fastify: FastifyInstance, options: any) {
    fastify.post("/quizes", opts, async(request, reply) => {
        const quizData = request.body as QuizRequestBody;

        const quiz = await addQuiz(quizData);
        if(quiz){
            reply.status(201).send({ result:'quiz added', data:quiz})
        } else {
            reply.status(500).send({ message:'could not add quiz'})
        }
    })

    fastify.get("/test", async(request, reply) => {
        reply.send({hello:"world"});
    })

    fastify.get("/quizes", async(request, reply) => {
        const quizes = getQuizes();
        reply.status(200).send({data:quizes})
    })
}