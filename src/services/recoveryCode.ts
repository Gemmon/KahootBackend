import { FastifyInstance } from "fastify"

export function generateRecoveryCode(length: number = 6, minutes: number = 15) : {code: string, expires: Date} {
    const code = Math.floor(100000 + Math.random() * 900000).toString().substring(0, length)
    const expires = new Date(Date.now() + minutes * 60 * 1000)
    return {code, expires}
}

export function generatePasswordResetToken(userId: number, fastify: FastifyInstance, minutes: number = 15): string{
    const payload = {
        id: userId,
        purpose: 'password-reset',
        jti: Math.random().toString(36).substring(2, 15)
    }

    const token = fastify.jwt.sign(payload, {
        expiresIn: `${minutes}m`
    })

    return token
}