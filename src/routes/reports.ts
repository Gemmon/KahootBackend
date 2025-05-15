import { FastifyInstance } from "fastify";
import prisma, { addQuizReport, addCommentReport, getReports, getReport, deleteReport, updateReport } from "../db.js";
import { Prisma } from "@prisma/client";


export interface ReportRequestBody{
    user_id: number,
    quiz_id: number,
    comment_id: number,
    reason: string,
}

const opts = {
    schema: {
        body: {
            type: 'object',
            properties: {
                user_id: { type: 'integer'},
                quiz_id: { type: 'integer'},
                comment_id: { type: 'integer'},
                reason: { type: 'string'},
            },
        }
    }
}


export default async function routes(fastify: FastifyInstance, options: any) {
    fastify.post("/reports", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const reportData = request.body as ReportRequestBody;
        const userId = (request.user as { id: number }).id;
        let report = null;
        if (reportData.comment_id != null && reportData.quiz_id != null) {
            reply.status(400).send({ message: 'You can only report a quiz or a comment, not both' });
        }
        else if (reportData.comment_id != null) {
            report = await addCommentReport(reportData, userId);
        }
        else if (reportData.quiz_id != null) {
            report = await addQuizReport(reportData, userId);
        }
        if(report){
            reply.status(201).send({ result:'Report added', data:report})
        } else {
            reply.status(500).send({ message:'Could not add report'})
        }
    })

    fastify.get("/reports", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const {
            user_id, quiz_id, comment_id, reviewed_by, resolved, page, limit, 
        } = request.query as {
            user_id: number, quiz_id: number, comment_id: number, reviewed_by: number, resolved: string, page: number, limit: number};
        const filters: Prisma.ReportWhereInput = {
            ...(user_id ? { user_id: Number(user_id) } : {}),
            ...(quiz_id ? { quiz_id: Number(quiz_id) } : {}),
            ...(comment_id ? { comment_id: Number(comment_id) } : {}),
            ...(reviewed_by ? { reviewed_by: Number(reviewed_by) } : {}),
            ...(resolved !== undefined && { resolved: resolved === 'true' }),
        };

        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = Number(limit) > 0 ? Number(limit) : 20;
        const skip = (Number(pageNumber) - 1) * Number(limitNumber);
        const take = Number(limitNumber);

        const totalLength = await prisma.report.count({where: filters});
        const reports = await getReports(filters, skip, take);
        reply.status(200).send({
            data:reports,
            meta: {
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalLength / limitNumber),
            }
        })
    })

    fastify.get("/reports/:id", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const reportId = parseInt((request.params as { id: string }).id);
        const report = await getReport(reportId);
        if(report) {
            reply.status(200).send({data:report});
        }
        else {
            reply.status(404).send({ message: 'Report not found' });
        }
    })

    fastify.delete("/reports/:id", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const reportId = parseInt((request.params as { id: string }).id);
        console.log("Deleting report with id: " + reportId);
        const report = await deleteReport(reportId);
        if (report) {
            reply.status(200);
        }
        else {
            reply.status(204);
        }
    })

    fastify.put("/reports/:id", {preHandler: [fastify.authenticate]}, async(request, reply) => {
        const reportId = parseInt((request.params as {id: string}).id);
        const report = await updateReport(reportId, request.body as ReportRequestBody);
        if(report) {
            reply.status(200).send({data:report});
        }
        else {
            reply.status(404).send({ message: 'Report not found' });
        }  
    })
}