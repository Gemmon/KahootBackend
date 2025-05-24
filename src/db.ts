import { PrismaClient, User, Quiz } from "@prisma/client";
import { sha256 } from "./functions.js";
import { title } from "process";
import { EditQuizRequestBody, QuizRequestBody } from "./routes/quizes.js";

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

export async function addQuiz(quizData: QuizRequestBody, userId: number){
  try {
    const quiz = await prisma.quiz.create({
      data: {
        titile: quizData.title,
        description: quizData.description,
        created_by: userId,
        is_public: quizData.is_public,
        created_at: new Date(),
        is_removed: false
      }
    });
    return quiz
  } catch (error){
    console.error("Error creating quiz: " + error);
    return null;
  }
}

export async function getQuizes(limit: number, offset: number) {
  return await prisma.quiz.findMany({
    skip: offset,
    take: limit,
    where: {
      is_removed: false,
    }
  })
}

export async function getQuizById(id: number){
  return await prisma.quiz.findFirst({
    where: {
      id: id
    }
  })
}

export async function removeQuizById(quizId: number, userId: number) {
  try {
    return await prisma.quiz.update({
      where: {
        id: quizId,
        created_by: userId,
        is_removed: false
      },
      data: {
        is_removed: true
      }
    })
      
  } catch (error) {
    return null;    
  }
}

export async function editQuiz(quizData:EditQuizRequestBody, userId: number) {
  try{
    return await prisma.quiz.update({
      where: {
        id: quizData.id,
        created_by: userId
      },
      data: {
        titile: quizData.title,
        description: quizData.description,
        is_public: quizData.is_public
      }
    })
  } catch(error){
    return null;
  }
}

export async function getSuggestedQuizes(limit: number, offset: number, userId?: number) {
  let sortLimit: number = Math.max(limit, 500); 
  const quizes = await prisma.quiz.findMany({
    take: sortLimit,
    where: {
      is_removed: false,
      is_public: true,
      ...(userId ? { created_by: { not: userId } } : {})
    },
    orderBy: {
      created_at: 'desc'
    }
  })
  if (quizes.length === 0) {
    return [];
  }
  const maxLikes: number = Math.max(...quizes.map(q => q.likes));
  const minLikes: number = Math.min(...quizes.map(q => q.likes));
  const likesGap: number = maxLikes - minLikes;
  const startTime: number = quizes[0].created_at.getTime();
  const endTime: number = quizes[quizes.length - 1].created_at.getTime();
  const timeGap: number = endTime - startTime;
  return quizes.map(q => ({
    ...q,
    score: 0.6 * ((q.likes - minLikes)/likesGap) + 0.4 * (q.rating_avg/5) + 0.1 * ((q.created_at.getTime() - startTime) / timeGap)
  })).sort((a, b) => b.score - a.score).slice(offset, offset + limit);
}