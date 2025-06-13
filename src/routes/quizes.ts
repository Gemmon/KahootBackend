import { FastifyInstance } from "fastify";
import { addQuiz, getQuizes, getQuizById, removeQuizById, editQuiz, getSuggestedQuizes, getLikedQuizzesByUser, getQuizHistoryByUser, getUserQuizes, addQuizFavourite, removeQuizFavourite,deleteQuestionsForQuiz, addQuestionsToQuiz, clearUserQuizHistory } from "../db.js";
import { get } from "http";
import { Favourite, Quiz } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises'
import path from 'path';


export interface QuizRequestBody{
    title: string,
    description: string,
    is_public: boolean,
    image?: string
}

export interface EditQuizRequestBody extends QuizRequestBody {
    id: number
}

const schema = {
    body: {
        type: 'object',
        properties: {
            title: { type: 'string'},
            description: { type: 'string'},
            is_public: { type: 'boolean'},
            image: { type: 'string' }
        },
        required: ['title', 'description', 'is_public'],
        additionalProperties: false
    }
}

export function getUserId(request: any){
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

    fastify.get("/quizes", async(request, reply) => {
        const query = request.query as {
            limit?: string,
            offset?: string
        }
        const limit = Number(query.limit)
        const offset = Number(query.offset)
        const quizes = await getQuizes(limit, offset);
        quizes.forEach(q => {
            if (!q.image)
                q.image = `https://placehold.co/300x150/004D1A/FFFFFF?text=${encodeURIComponent(q.title)}`
            else
                q.image = process.env.API_BASE_URL + q.image
        })
        reply.status(200).send({data:quizes})
    })

    fastify.get("/quizes/:id", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const quizId = parseInt((request.params as {id:string}).id)
        const quiz = await getQuizById(quizId, getUserId(request))
        if(quiz){
            if (!quiz.image)
                quiz.image = `https://placehold.co/300x150/004D1A/FFFFFF?text=${encodeURIComponent(quiz.title)}`
            else
                quiz.image = process.env.API_BASE_URL + quiz.image
            reply.status(200).send({quiz})
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
        likedQuizzes.forEach(q => {
            if (!q.image)
                q.image = `https://placehold.co/300x150/004D1A/FFFFFF?text=${encodeURIComponent(q.title)}`
            else
                q.image = process.env.API_BASE_URL + q.image
        })

        const result = likedQuizzes.map((q: any) => ({
            id: q.id,
            title: q.title,
            isLiked: true,
            image: q.image
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
        const quizes = await getSuggestedQuizes(limit, offset, getUserId(request), sort_by) ?? [];
        quizes.forEach(q => {
            if (!q.image)
                q.image = `https://placehold.co/300x150/004D1A/FFFFFF?text=${encodeURIComponent(q.title)}`
            else
                q.image = process.env.API_BASE_URL + q.image
        })
        reply.status(200).send({data:quizes})
    });

    fastify.get("/quizes/history", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const query = request.query as {
            limit?: string,
        }
        const userId = getUserId(request)
        
        const limit = query.limit == null ? 12 : Number(query.limit)
        const quizes = await getQuizHistoryByUser(userId, limit)
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
        const ownQuizzes: (Quiz & { isLiked?: boolean } & { Favourite?: Favourite[] })[] = await getUserQuizes(limit, offset, userId, sort_by, reverse) ?? [];
        ownQuizzes.forEach(q => { q.isLiked = q.Favourite && q.Favourite.length > 0; delete q.Favourite; });
        ownQuizzes.forEach(q => {
            if (!q.image)
                q.image = `https://placehold.co/300x150/004D1A/FFFFFF?text=${encodeURIComponent(q.title)}`
            else
                q.image = process.env.API_BASE_URL + q.image
        })
        reply.status(200).send({data: ownQuizzes})
    });

    //POST /quizzes stworzenie quizu, jezeli jest id w body, to aktualizacja quizu
    fastify.post("/quizzes", {preHandler: [fastify.authenticate]}, async(request, reply) => {
            try{
                const quizData=request.body as {
                    quizId?: number,
                    title: string,
                    description: string,
                    questions: Array<{
                        content: string, 
                        answers: Array<{ content: string, is_correct: boolean }>,
                        partial_points?: boolean, 
                        negative_points?: boolean, 
                        max_points: number ,
                        time?: number
                    }>,
                    image?: string,
                    is_public: boolean
                }
                const userId= getUserId(request);
                if(!quizData.title || !quizData.description || !quizData.questions || quizData.questions.length === 0){
                  return reply.status(400).send({ message: 'Title, description info about public and questions are required.' });
                }
                if (quizData.image) {
                  const base64Image = quizData.image.split(';base64,').pop();
                  if (base64Image) {
                    const imageBuffer = Buffer.from(base64Image, 'base64');
                    const imageId = uuidv4();
                    await fs.writeFile(path.join(process.cwd(), 'public', `${imageId}.png`), imageBuffer);
                    quizData.image = `${imageId}.png`;
                  }
                }
                if(quizData.quizId){
                    const updatedQuiz = await editQuiz({
                        id: quizData.quizId,
                        title: quizData.title,
                        description: quizData.description,
                        is_public: quizData.is_public,
                        image: quizData.image
                    }, userId);
                    if(!updatedQuiz){
                        return reply.status(404).send({ message: 'Quiz not found.' });
                    }
                    await deleteQuestionsForQuiz(quizData.quizId);
                    await addQuestionsToQuiz(quizData.quizId, quizData.questions);

                    return reply.status(200).send({ data: updatedQuiz });

                } else {
                    const newQuiz = await addQuiz({
                        title: quizData.title,
                        description: quizData.description,
                        is_public: quizData.is_public,
                        image: quizData.image
                    }, userId);
                    if(newQuiz){
                        await addQuestionsToQuiz(newQuiz.id, quizData.questions);
                        return reply.status(201).send({data: newQuiz});
                    } else {
                        return reply.status(500).send({message:'Could not create quiz'});
                    }
                }
            } catch (error) {
                console.error("Error creating or updating quiz:", error);
                return reply.status(500).send({ message: 'Internal server error.' });
            }
    })


    //POST /quizzes/history/clear, usówa historię quzów, w których użytkownik brał udział (usuwa elemnty z game_players)
    fastify.post("/quizzes/history/clear", {
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            const success = await clearUserQuizHistory(getUserId(request));

            if (success) {
                reply.code(200).send({
                    success: true,
                    message: "History has been cleared."
                });
            } else {
                reply.code(500).send({
                    success: false,
                    message: "Internal server error."
                });
            }
        }
    });
}
