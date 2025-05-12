import { FastifyInstance } from "fastify";
import { addQuiz, getQuizes, getQuizById, removeQuizById, editQuiz } from "../db.js";

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
            required: ['title', 'description', 'is_public']
        }
    }
}


export default async function routes(fastify: FastifyInstance, options: any) {
    fastify.post("/quizes", {preHandler: [fastify.authenticate]}, opts, async(request, reply) => {
        const quizData = request.body as QuizRequestBody
        quizData.created_by = request.user.id
        
        const quiz = await addQuiz(quizData);
        if(quiz){
            reply.status(201).send({ result:'quiz added', data:quiz})
        } else {
            reply.status(500).send({ message:'could not add quiz'})
        }
    })

    fastify.get("/quizes", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const query = request.query as {
            limit?: string,
            offset?: string
        }
        const limit = Number(query.limit)
        const offset = Number(query.offset)
        const quizes = await getQuizes(limit, offset, request.user.id);
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

    fastify.delete("/quizes/:id", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const quizId = parseInt((request.params as {id:string}).id)
        const quiz = await removeQuizById(quizId, request.user.id)
        if(quiz){
            reply.status(200).send({data:quiz})
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })

    fastify.patch("/quizes", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const quizData = request.body as EditQuizRequestBody
        const quiz = await editQuiz(quizData, request.user.id)
        if(quiz){
            reply.status(200).send({data:quiz})
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })
}