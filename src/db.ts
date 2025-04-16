import { PrismaClient, User, Quiz } from "@prisma/client";
import { sha256 } from "./functions.js";
import { title } from "process";
import { QuizRequestBody } from "./routes/quizes.js";

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

export async function addQuiz(quizData: QuizRequestBody){
  try {
    const quiz = await prisma.quiz.create({
      data: {
        id: 123,
        titile: quizData.title,
        description: quizData.description,
        created_by: quizData.created_by,
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

export async function getQuizes() {
  return await prisma.quiz.findMany()
}