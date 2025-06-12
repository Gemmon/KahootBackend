import 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    // delete(arg0: string, arg1: { preHandler: any[] }, arg2: (request: any, reply: any) => Promise<void>): unknown
    // put(arg0: string, arg1: { preHandler: any[] }, arg2: (request: any, reply: any) => Promise<void>): unknown
    // post(arg0: string, arg1: { preHandler: any[] }, arg2: (request: any, reply: any) => Promise<void>): unknown
    // get(arg0: string, arg1: { preHandler: any[] }, arg2: (request: any, reply: any) => Promise<any>): unknown
    authenticate: any
    jwt: any
  }
}
