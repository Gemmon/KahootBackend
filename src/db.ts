import { PrismaClient, User, Prisma } from "@prisma/client";
import { sha256 } from "./functions.js";
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

export async function addQuizReport(reportData: ReportRequestBody) {
  try {
    const lastReport = await prisma.report.findFirst({
      orderBy: {
        id: 'desc',
      }
    });

    const newId = lastReport ? lastReport.id + 1 : 1;

    const report = await prisma.report.create({
      data: {
        id: newId,
        user_id: reportData.user_id,
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

export async function addCommentReport(reportData: ReportRequestBody) {
  try {
    const lastReport = await prisma.report.findFirst({
      orderBy: {
        id: 'desc',
      }
    });

    const newId = lastReport ? lastReport.id + 1 : 1;
    console.log(reportData.reason,)
    const report = await prisma.report.create({
      data: {
        id: newId,
        user_id: reportData.user_id,
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

export async function getReports(filters: Prisma.ReportWhereInput) {
  return await prisma.report.findMany({
    where: filters
  });
}

export async function getReport(id: number) {
  console.log("Getting report with id: " + id);
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
        user_id: reportData.user_id,
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