import type { FastifyInstance } from "fastify";
import { sha256 } from "../functions.js";
import { findEmail, login } from "../db.js";
import prisma from "../db.js"
import { sendRecoveryEmail } from "../services/mailer.js";
import { emit } from "process";



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

        if(!await findEmail(email)){
            return reply.status(404).send({message: "User not found"})
        }

        try{
            const code = await sendRecoveryEmail(email)
            return reply.status(200).send({ message: "Recovery code sent to " + email})
        } catch(error){
            return reply.status(500).send({ error: "Failed to send recovery email"})
        }
    })

}