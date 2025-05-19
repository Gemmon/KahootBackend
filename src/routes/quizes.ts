import { FastifyInstance } from "fastify";
import { addQuiz, getQuizes, getQuizById, removeQuizById, editQuiz, removeQuizRating, addOrUpdateQuizRating } from "../db.js";

export interface QuizRequestBody{
    title: string,
    description: string,
    is_public: boolean
}

export interface EditQuizRequestBody{
    id: number,
    title: string,
    description: string,
    is_public: boolean
}

const schema = {
    body: {
        type: 'object',
        properties: {
            title: { type: 'string'},
            description: { type: 'string'},
            is_public: { type: 'boolean'},
        },
        required: ['title', 'description', 'is_public'],
        additionalProperties: false
    }
}

function getUserId(request: any){
    const user = request.user as {id: number}
    return user.id
}

export default async function routes(fastify: FastifyInstance, options: any) {
    fastify.post("/quizes", {preHandler: [fastify.authenticate], schema}, async(request, reply) => {
        const quizData = request.body as QuizRequestBody

        const quiz = await addQuiz(quizData, getUserId(request));
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
        const quizes = await getQuizes(limit, offset);
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
        const quiz = await removeQuizById(quizId, getUserId(request))
        if(quiz){
            reply.status(200).send({data:quiz})
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })

    fastify.patch("/quizes", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const quizData = request.body as EditQuizRequestBody
        const quiz = await editQuiz(quizData, getUserId(request))
        if(quiz){
            reply.status(200).send({data:quiz})
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })

    fastify.post("/quizes/:id/like", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const quizId = parseInt((request.params as {id:string}).id)
        if(isNaN(quizId)){
            return reply.status(400).send({ message: 'Invalid quiz ID' });
        }

        const userId = getUserId(request)
        if(isNaN(userId)){
            return reply.status(400).send({ message: 'Invalid user ID' });
        }

        const { rating } = request.body as { rating: number }
        if (rating < 1 || rating > 5) {
            return reply.status(400).send({ message: 'Rating must be between 1 and 5' });
        }

        const quiz = await addOrUpdateQuizRating(quizId, userId, rating)
        if(quiz){
            reply.status(200).send({
                success: true,
                message: "Quiz liked."
            })
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })

    fastify.delete("/quizes/:id/like", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const quizId = parseInt((request.params as {id:string}).id)
        if(isNaN(quizId)){
            return reply.status(400).send({ message: 'Invalid quiz ID' });
        }

        const userId = getUserId(request)
        if(isNaN(userId)){
            return reply.status(400).send({ message: 'Invalid user ID' });
        }

        const quiz = await removeQuizRating(quizId, userId)
        if(quiz){
            reply.status(200).send({
                success: true,
                message: "Quiz unliked."
            })
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })
}