import type { FastifyInstance } from "fastify";
import { sha256 } from "../functions.js";
import { findRecoveryCode, findUserByEmail, login, saveRecoveryCode } from "../db.js";
import prisma from "../db.js"
import { sendRecoveryEmail } from "../services/mailer.js";
import { emit } from "process";
import { generatePasswordResetToken, generateRecoveryCode } from "../services/recoveryCode.js";
import {getUserId} from "./quizes.js"



export default async function authRoutes(fastify: FastifyInstance) {

    // /register - wymaga podania emaila, hasla i username
    fastify.post("/register",  async (request, reply) => {
        const { email, password, username, is_admin } = request.body as {
            email: string
            password: string
            username: string
            is_admin: boolean

          }

        const existingUser= await prisma.user.findFirst({ where: { email } })
        if (existingUser) {
            return reply.status(400).send({ message: "User already exists" })
        }

        const hashedPassword= sha256(password)
        if(!hashedPassword){
            return reply.status(400).send({ message: "Password hashing failed" })
        }

        const user= await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username,
                is_admin: false,
                created_at: new Date()
                
              }
        })

        const token=fastify.jwt.sign({ id: user.id, email: user.email })
        reply.send({ token })

    })

    // /login - wymaga podania emaila i hasla
    fastify.post("/login", async(request, reply)=>{
        const {email, password}=request.body as {email:string, password:string}
        const user=await prisma.user.findUnique({where:{email}})
        if(user){
            const isValidPassword= sha256(password)===user.password
            if(isValidPassword){
                const token=fastify.jwt.sign({id:user.id, email:user.email})
                return reply.send({token})
            }
        }else{
            return reply.status(400).send({message:"No user found with this email"})
        }
    })

    // /me - zwraca informacje o aktualnym uzytkowniku
    fastify.get("/me", {preHandler: [fastify.authenticate]}, async (request, reply) => {
        //@ts
        const user = request.user as { id: number; email: string, username: string, is_admin: boolean }
        return {user}
    })

    // /users - listta uzytkownikow, admin tylko
    fastify.get("/users", {preHandler: [fastify.authenticate]}, async (request, reply) => {
        const users = await prisma.user.findMany()
        return { users }
    })

    // /logout - wylogowuje uzytkownika
    fastify.post("/logout", {preHandler: [fastify.authenticate]}, async (request, reply) => {
        // we frontendzie usuwamy token z local storage
        return reply.status(200).send({ message: "Logged out" })
    })

    // /delete - usuwanie uzytkownika
    fastify.delete("/delete", {preHandler: [fastify.authenticate]}, async (request, reply) => {
        const user = request.user as { id: number; email: string, username: string, is_admin: boolean }
        await prisma.user.delete({ where: { id: user.id } })
        return reply.status(200).send({ message: "User deleted" })
    })

    // odzyskanie hasla request code
    fastify.post("/recover/request-code", async(request, reply) => {
        const email = (request.body as { email: string }).email
        const user = await findUserByEmail(email)

        if(!user){
            return reply.status(404).send({message: "User not found"})
        }

        try{
            const {code, expires} = generateRecoveryCode()
            console.log("code generated")
            await saveRecoveryCode(user.id, code, expires)
            console.log("code saved")
            await sendRecoveryEmail({
                to: email,
                subject: 'Password Recovery Code',
                text: `Your recovery code is: ${code}`,
                html: `<p>Your recovery code is: <strong>${code}</strong></p>`
            })
            console.log(code) // usun to
            return reply.status(200).send({ message: "Recovery code sent to " + email})
        } catch(error){
            return reply.status(500).send({ error: "Failed to send recovery email"})
        }
    })

    fastify.post("/recover/recovery-code", async(request, reply) => {
        const body = request.body as {
            email: string,
            code: string
        }

        try{
            const code = await findRecoveryCode(body.email, body.code)

            if(!code){
                return reply.status(404).send({message: "Invalid or expired code"})
            }

            const token = generatePasswordResetToken(code.user_id, fastify)

            return reply.status(200).send({
                message: "Code verified, proceed to reset password",
                token: token
            })

        } catch (error) {
            return reply.status(500).send({message: "User not found"})
        }
    })

    // /recover/change-password - zmiana hasla
    fastify.post("/recover/change-password", {preHandler: [fastify.authenticate]},async(request, reply) => {
        const user=getUserId(request)
        const { newPassword } = request.body as { newPassword: string }
        if(!user || isNaN(user)){
            return reply.status(400).send({ message: "Invalid user ID" })
        }
        const hashedPassword = sha256(newPassword)
        if(!hashedPassword){
            return reply.status(400).send({ message: "Password hashing failed" })
        }
        const updatedUser=await prisma.user.update({
            where: { id: user },
            data: { password: hashedPassword }
        })
        if(!updatedUser){
            return reply.status(500).send({ message: "Failed to update password" })
        }
        return reply.status(200).send({ message: "Password changed successfully" })

    })

}