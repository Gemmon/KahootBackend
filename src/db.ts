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

export async function getLikedQuizzesByUser(userId: number, sortBy: "created_at" | "title" | "rating") {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        Favourite: {
          some: {
            user_id: userId
          }
        },
        is_removed: false
      },
      select: {
        id: true,
        titile: true,
        created_at: true,
        Rating: {
          select: {
            rating: true
          }
        }
      }
    })

    const quizzesWithAvgRating = quizzes.map(q => ({
      ...q,
      avgRating: q.Rating.length > 0
          ? q.Rating.reduce((acc, r) => acc + r.rating, 0) / q.Rating.length
          : 0
    }))

    const sorted = quizzesWithAvgRating.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.titile.localeCompare(b.titile)
        case "rating":
          return b.avgRating - a.avgRating
        case "created_at":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return sorted
  } catch (error) {
    console.error("Error fetching liked quizzes:", error)
    return []
  }
}