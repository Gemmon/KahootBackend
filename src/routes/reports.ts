import { FastifyInstance } from "fastify";
import { addQuizReport, addCommentReport, getReports, getReport, deleteReport, updateReport } from "../db.js";
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
    fastify.post("/reports", opts, async(request, reply) => {
        const reportData = request.body as ReportRequestBody;
        let report = null;
        if (reportData.comment_id != null && reportData.quiz_id != null) {
            reply.status(400).send({ message: 'You can only report a quiz or a comment, not both' });
        }
        else if (reportData.comment_id != null) {
            report = await addCommentReport(reportData);
        }
        else if (reportData.quiz_id != null) {
            report = await addQuizReport(reportData);
        }
        if(report){
            reply.status(201).send({ result:'Report added', data:report})
        } else {
            reply.status(500).send({ message:'Could not add report'})
        }
    })

    fastify.get("/reports", async(request, reply) => {
        const {user_id, quiz_id, comment_id, reviewed_by, resolved} = request.query as {user_id: number, quiz_id: number, comment_id: number, reviewed_by: number, resolved: string};
        const filters: Prisma.ReportWhereInput = {
            ...(user_id ? { user_id: Number(user_id) } : {}),
            ...(quiz_id ? { quiz_id: Number(quiz_id) } : {}),
            ...(comment_id ? { comment_id: Number(comment_id) } : {}),
            ...(reviewed_by ? { reviewed_by: Number(reviewed_by) } : {}),
            ...(resolved !== undefined && { resolved: resolved === 'true' }),
        };
        const reports = await getReports(filters);
        console.log(reports)
        reply.status(200).send({data:reports})
    })

    fastify.get("/reports/:id", async(request, reply) => {
        const reportId = parseInt((request.params as { id: string }).id);
        const report = await getReport(reportId);
        if(report) {
            reply.status(200).send({data:report});
        }
        else {
            reply.status(404).send({ message: 'Report not found' });
        }
    })

    fastify.delete("/reports/:id", async(request, reply) => {
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

    fastify.put("/reports/:id", async(request, reply) => {
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