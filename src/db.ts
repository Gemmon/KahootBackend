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

export async function addOrUpdateQuizRating(quizId: number, userId: number, quizRating: number) {
  try {
    const existingRating = await prisma.rating.findUnique({
      where: {
        quiz_id_user_id: {
          quiz_id: quizId,
          user_id: userId,
        }
      }
    });

    if (existingRating) {
      return await prisma.rating.update({
        where: { id: existingRating.id },
        data: { rating: quizRating },
      });
    } else {
      return await prisma.rating.create({
        data: {
          quiz_id: quizId,
          user_id: userId,
          rating: quizRating,
        }
      });
    }
  } catch (error) {
    console.error("Error quiz rating: " + error);
    return null;
  }
}

export async function removeQuizRating(quizId: number, userId: number) {
  try {
    return await prisma.rating.delete({
      where: {
        quiz_id_user_id: {
          quiz_id: quizId,
          user_id: userId
        }
      }
    });
  } catch (error) {
    console.error("Error removing quiz rating:", error);
    return null;
  }
}