import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "../../infrastructure/auth/auth.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }
}

/** onRequest hook: resolve the Better Auth session into request.currentUser. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  request.currentUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}
