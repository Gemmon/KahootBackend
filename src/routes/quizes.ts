import { FastifyInstance } from "fastify";
import { addQuiz, getQuizes, getQuizById, removeQuizById, editQuiz, getSuggestedQuizes, getLikedQuizzesByUser, getUserQuizes, addQuizFavourite, removeQuizFavourite } from "../db.js";
import { get } from "http";

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

    fastify.get("/quizes/liked", { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const userId = getUserId(request)
        const { sort_by } = request.query as { sort_by?: "created_at" | "title" | "rating" }

        const validSortFields = ["created_at", "title", "rating"] as const
        const sortBy: "created_at" | "title" | "rating" = validSortFields.includes(sort_by as any)
            ? (sort_by as "created_at" | "title" | "rating")
            : "created_at"

        const likedQuizzes = await getLikedQuizzesByUser(userId, sortBy)

        const result = likedQuizzes.map(q => ({
            id: q.id,
            title: q.title
        }))

        reply.status(200).send(result)
    })

    fastify.get("/quizes/suggested", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const query = request.query as {
            limit?: string,
            offset?: string
            sort_by?: "created_at" | "likes" | "title"
        }
        const limit = Number(query.limit) || 100;
        const offset = Number(query.offset) || 0;
        const sort_by = query.sort_by;
        const quizes = await getSuggestedQuizes(limit, offset, getUserId(request), sort_by);
        reply.status(200).send({data:quizes})
    });

    fastify.post("/quizes/:id/favourite", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const quizId = parseInt((request.params as {id:string}).id)
        if(isNaN(quizId)){
            return reply.status(400).send({ message: 'Invalid quiz ID' });
        }

        const userId = getUserId(request)
        if(isNaN(userId)){
            return reply.status(400).send({ message: 'Invalid user ID' });
        }

        const quiz = await addQuizFavourite(quizId, userId)
        if(quiz){
            reply.status(200).send({
                success: true,
                message: "Quiz favourite."
            })
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })

    fastify.delete("/quizes/:id/favourite", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const quizId = parseInt((request.params as {id:string}).id)
        if(isNaN(quizId)){
            return reply.status(400).send({ message: 'Invalid quiz ID' });
        }

        const userId = getUserId(request)
        if(isNaN(userId)){
            return reply.status(400).send({ message: 'Invalid user ID' });
        }

        const quiz = await removeQuizFavourite(quizId, userId)
        if(quiz){
            reply.status(200).send({
                success: true,
                message: "Quiz not favourite."
            })
        } else {
            reply.status(404).send({message:'Quiz not found'})
        }
    })
    fastify.get("/quizes/own", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const query = request.query as {
            limit: string,
            offset?: string
            sort_by?: "created_at" | "likes" | "title",
            reverse?: string
        }
        const limit = Number(query.limit) || 100;
        const offset = Number(query.offset) || 0;
        const sort_by = query.sort_by;
        const userId = getUserId(request);
        const reverse = query.reverse === 'true' || query.reverse === '1';
        const ownQuizzes = await getUserQuizes(limit, offset, userId, sort_by, reverse);
        reply.status(200).send({data: ownQuizzes})
    });
}
