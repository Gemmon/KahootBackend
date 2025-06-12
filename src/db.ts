import { PrismaClient, User } from "@prisma/client";
import { sha256 } from "./functions.js";

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