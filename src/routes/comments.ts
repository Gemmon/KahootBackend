import { FastifyInstance } from "fastify";
import { addComment, getCommentsOfQuiz, getCommentsOfUser, updateComment, deleteComment } from "../db.js";


export interface CommentRequestBody{
    quiz_id: number,
    user_id: number,
    content: string,
}

const opts = {
    schema: {
        body: {
            type: 'object',
            required: ['quiz_id', 'user_id', 'content'],
            properties: {
                quiz_id: { type: 'integer' },
                user_id: { type: 'integer' },
                content: { type: 'string' },
            },
        },
    },
}

export default async function routes(fastify: FastifyInstance, options: any) {
    fastify.post("/comments", opts, async(request, reply) => {
        const commentData = request.body as CommentRequestBody;
        let comment = null;
        if (commentData.content != null) {
            comment = await addComment(commentData);
        }
        if(comment){
            reply.status(201).send({ result: 'Comment added', data: comment});
        } else {
            reply.status(500).send({ message: 'Could not add comment'});
        }
    })

    fastify.get("/comments/quiz/:id", async(request, reply) => {
        const quizId = parseInt((request.params as { id: string }).id);
        const commentsOfQuiz = await getCommentsOfQuiz(quizId);
        console.log(commentsOfQuiz);
        reply.status(200).send({ data: commentsOfQuiz });
    })

    fastify.get("/comments/user/:id", async(request, reply) => {
        const userId = parseInt((request.params as { id: string }).id);
        const commentsOfUser = await getCommentsOfUser(userId);
        console.log(commentsOfUser);
        reply.status(200).send({ data: commentsOfUser });
    })

    fastify.delete("/comments/:id", async(request, reply) => {
        const commentId = parseInt((request.params as { id: string }).id);
        console.log("Deleting comment with id: " + commentId);
        const comment = await deleteComment(commentId);

        if(comment){
            reply.status(200);
        }else{
            reply.status(204);
        }
    })

    fastify.put("/comments/:id", async(request, reply) => {
        const commentId = parseInt((request.params as { id: string }).id);
        const comment = await updateComment(commentId, request.body as CommentRequestBody);
        if(comment){
            reply.status(200).send({ data: comment });
        }else{
            reply.status(404).send({ message: "Comment not found" });
        }
    })
}