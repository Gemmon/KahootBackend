import { FastifyInstance } from "fastify";
import { addQuiz, getQuizes, getQuizById, removeQuizById, editQuiz } from "../db.js";
import { request } from "http";

export interface QuizRequestBody{
    title: string,
    description: string,
    created_by: number,
    is_public: boolean
}

export interface EditQuizRequestBody{
    id: number,
    title: string,
    description: string,
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
        const quizes = await getQuizes();
        reply.status(200).send({data:quizes})
    })

    fastify.get("/quizes/:id", async(request, reply) => {
        const quizId = parseInt((request.params as {id:string}).id)
        const quiz = await getQuizById(quizId)
        if(quiz){
            reply.status(200).send({data:quiz})
        } else {
            reply.status(404).send({message: 'Quiz not found'})
        }
    })

    fastify.delete("/quizes/:id", async(request, reply) => {
        const quizId = parseInt((request.params as {id:string}).id)
        const quiz = await removeQuizById(quizId)
        if(quiz){
            reply.status(200).send({data:quiz})
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })

    fastify.patch("/quizes", async(request, reply) => {
        const quizData = request.body as EditQuizRequestBody
        const quiz = await editQuiz(quizData)
        if(quiz){
            reply.status(200).send({data:quiz})
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })
}