import { PrismaClient, Prisma, User, Quiz, User_recovery } from "@prisma/client";
import { sha256 } from "./functions.js";
import { title } from "process";
import { EditQuizRequestBody, QuizRequestBody } from "./routes/quizes.js";
import { ReportRequestBody } from "./routes/reports.js";

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


//Quizy
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