import { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';

export function generateRecoveryCode(length: number = 6): string {
  return Math.floor(100000 + Math.random() * 900000).toString().substring(0, length);
}

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

export async function sendRecoveryEmail(email: string) {
    const code = generateRecoveryCode()
    try {
        const info = await transporter.sendMail({
            from: "support@gahoot.com",
            to: email,
            subject: 'Password Recovery Code',
            text: `Your recovery code is: ${code}`,
            html: `<p>Your recovery code is: <strong>${code}</strong></p>`
        });
        return code
    } catch (error){
        throw new Error("Failed to send recovery email")
    }
}
