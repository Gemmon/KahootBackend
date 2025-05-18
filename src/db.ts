import { PrismaClient, User, Quiz, User_recovery } from "@prisma/client";
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

export async function findUserByEmail(userEmail:string) {
  try{
    const user = await prisma.user.findFirst({
      where: {
        email: userEmail
      },
      select: {
        id: true
      }
    })

    return user

  } catch (error){
    return null
  }
}

export async function saveRecoveryCode(userId: number, code: string, expires: Date) {
  try {
    await prisma.user_recovery.createMany({
      data: {
        user_id: userId,
        code: code,
        expires: new Date(expires)
      }
    })
  } catch (error){
    console.log("Error adding recovery code")
    if (error instanceof Error) {
      console.error(error)
    }
    throw new Error("Error adding recovery code")
  } 
}

export async function findRecoveryCode(email:string, code: string) {
  try {
    const user = await findUserByEmail(email)

    if(!user){
      throw new Error("User not found")
    }

    return await prisma.user_recovery.findFirst({
      where: {
        user_id: user.id,
        code: code,
        expires: {
          gt: new Date()
        }
      }, 
      select: {
        user_id: true,
        code: true
      }
    })
  } catch (error){
    console.log("Error finding recovery code")
    throw new Error("Error finding recovery code")
  }
}
