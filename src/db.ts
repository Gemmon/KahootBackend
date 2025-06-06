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
        title: quizData.title,
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

export async function editQuiz(quizData: EditQuizRequestBody, userId: number) {
  try {
    return await prisma.quiz.update({
      where: {
        id: quizData.id,
        created_by: userId
      },
      data: {
        title: quizData.title,
        description: quizData.description,
        is_public: quizData.is_public
      }
    })
  } catch (error) {
    return null;
  }
}

export async function getSuggestedQuizes(
  limit: number,
  offset: number,
  userId?: number,
  sort_by: "created_at" | "likes" | "title" | "score" = "score"
) {
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
  const scoredQuizes = quizes.map(q => ({
    ...q,
    score: 0.6 * ((q.likes - minLikes) / likesGap) + 0.4 * (q.rating_avg / 5) + 0.1 * ((q.created_at.getTime() - startTime) / timeGap)
  })).sort((a, b) => b.score - a.score);

  if (sort_by === "created_at") {
    scoredQuizes.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  } else if (sort_by === "likes") {
    scoredQuizes.sort((a, b) => b.likes - a.likes);
  } else if (sort_by === "title") {
    scoredQuizes.sort((a, b) => a.title.localeCompare(b.title));
  }

  return scoredQuizes.slice(offset, offset + limit);
}

export async function getUserQuizes(
  limit: number, 
  offset: number,
  userId: number,
  sort_by: "created_at" | "likes" | "title" = "created_at",
  reverse: boolean = false) {
  try {
      return await prisma.quiz.findMany({
        where: {
          created_by: userId,
          is_removed: false
        },
        skip: offset,
        take: limit,
        orderBy: {
          [sort_by]: reverse ? 'asc' : 'desc'
        },
      });
  } 
  catch (error) {
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
        title: true,
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
          return a.title.localeCompare(b.title)
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

export async function addQuizFavourite(quizId: number, userId: number) {
  try {
    const existingFavorite = await prisma.favourite.findFirst({
      where: {
        quiz_id: quizId,
        user_id: userId,
      },
  });

    if (existingFavorite) {
      return true; // Jak funkcja jest wywoływana, to zwrócona wartość mówi czy jest ok czy nie, więc zwracam true
    } else {
      return await prisma.favourite.create({
        data: {
          quiz_id: quizId,
          user_id: userId,
        }
      });
    }
  } catch (error) {
    console.error("Error quiz rating: " + error);
    return null;
  }
}

export async function removeQuizFavourite(quizId: number, userId: number) {
  try {
    return await prisma.favourite.deleteMany({ // delete wymaga unikalnego id, więc używam deleteMany, na wszelki wypadek nie będę modyfikował bazy danych
      where: {
        quiz_id: quizId,
        user_id: userId,
      }
    });
  } catch (error) {
    console.error("Error removing quiz favourite:", error);
    return null;
  }
}
