import { PrismaClient, User } from "@prisma/client";
import { sha256 } from "./functions.js";
import { CommentRequestBody } from "./routes/comments.js";

const prisma = new PrismaClient();

export default prisma;

export async function login(email: string, password: string): Promise<User | null> {
  return await prisma.user.findFirst({
    where: {
      email: email,
      password: sha256(password),
    }
  });
}

export async function addComment(commentData: CommentRequestBody) {
  try {
    const lastComment = await prisma.comment.findFirst({
      orderBy: {
        id: 'desc',
      }
    });

    const newId = lastComment ? lastComment.id + 1 : 1;

    const comment = await prisma.comment.create({
      data: {
        id: newId,
        quiz_id: commentData.quiz_id,
        user_id: commentData.user_id,
        content: commentData.content,
        created_at: new Date(),
        is_removed: false,
      }
    });
    return comment;
  } catch (error) {
    console.error("Error creating comment: " + error);
    return null;
  }
}

export async function getCommentsOfQuiz(id: number) {
  console.log("Getting comments of quiz: " + id);
  return await prisma.comment.findMany({
    where: {
      quiz_id: id,
    }
  });
}

export async function getCommentsOfUser(id: number) {
  console.log("Getting comments of User: " + id);
  return await prisma.comment.findMany({
    where: {
      user_id: id,
    }
  });
}

export async function updateComment(id: number, commentData: CommentRequestBody){
  try{
    const comment = await prisma.comment.update({
      where: {
        id: id,
      },
      data: {
        content: commentData.content,
        created_at: new Date(),
      }
    });
    return comment;
  }
  catch(error){
    console.error("Error updating comment: " + error);
    return null;
  }
}

export async function deleteComment(id: number){
  try{
    const comment = await prisma.comment.delete({
      where: {
        id: id,
      }
    });
    return comment;
  }
  catch(error){
    console.error("Error deleting comment: " + error)
    return null;
  }
}