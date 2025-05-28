import { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

export async function sendRecoveryEmail(data: {
    to: string,
    subject: string,
    text: string,
    html: string
}) {
    try {
        await transporter.sendMail({ from: process.env.SMTP_FROM || '', ...data });
    } catch (error){
        throw new Error("Failed to send email")
    }
}
