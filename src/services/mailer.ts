import { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'harmony.lueilwitz53@ethereal.email',
        pass: 'erkHDkbcYf4v1zK4U1'
    }
});

export async function sendRecoveryEmail(data: {
    from: string,
    to: string,
    subject: string,
    text: string,
    html: string
}) {
    try {
        await transporter.sendMail(data);
    } catch (error){
        throw new Error("Failed to send email")
    }
}
