import { PrismaClient, Prisma, User, Quiz } from "@prisma/client";
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

//Raportowanie
export async function addQuizReport(reportData: ReportRequestBody, userId: number) {
  try {
    const lastReport = await prisma.report.findFirst({
      orderBy: {
        id: 'desc',
      }
    });

    const report = await prisma.report.create({
      data: {
        user_id: userId,
        quiz_id: reportData.quiz_id,
        comment_id: null,
        reason: reportData.reason,
        reviewed_by: null,
        resolved: false,
        comment: null,
      }
    });
    return report;
  } catch (error) {
    console.error("Error creating report: " + error);
    return null;
  }
}

export async function addCommentReport(reportData: ReportRequestBody, userId: number) {
  try {
    const lastReport = await prisma.report.findFirst({
      orderBy: {
        id: 'desc',
      }
    });

    console.log(reportData.reason,)
    const report = await prisma.report.create({
      data: {
        user_id: userId,
        quiz_id: null,
        comment_id: reportData.comment_id,
        reason: reportData.reason,
        reviewed_by: null,
        resolved: false,
        comment: null,
      }
    });
    return report;
  } catch (error) {
    console.error("Error creating report: " + error);
    return null;
  }
}

export async function getReports(filters: Prisma.ReportWhereInput, limit: number, offset: number) {
  return await prisma.report.findMany({
    skip: offset,
    take: limit,
    where: filters
  });
}

export async function getReport(id: number) {
  return await prisma.report.findFirst({
    where: {
      id: id,
    }
  });
}

export async function deleteReport(id: number) {
  try {
    const report = await prisma.report.delete({
      where: {
        id: id,
      }
    });
    return report;
  } catch (error) {
    console.error("Error deleting report: " + error);
    return null;
  }
}

export async function updateReport(id: number, reportData: ReportRequestBody) {
  try {
    const report = await prisma.report.update({
      where: {
        id: id,
      },
      data: {
        quiz_id: reportData.quiz_id,
        comment_id: reportData.comment_id,
        reason: reportData.reason,
      }
    })
    return report;
  }
  catch (error) {
    console.error("Error updating report: " + error);
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