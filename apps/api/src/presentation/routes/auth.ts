import type { FastifyInstance } from "fastify";
import { auth } from "../../infrastructure/auth/auth.js";

const BODY_LESS_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Bridge Better Auth's Fetch-API handler into Fastify. */
export function registerAuthRoutes(app: FastifyInstance) {
  app.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      const url = `${request.protocol}://${request.host}${request.raw.url}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value === undefined || key === "content-length") continue;
        headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      }

      let body: string | undefined;
      if (!BODY_LESS_METHODS.has(request.method)) {
        body = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
        if (!headers.has("content-type")) headers.set("content-type", "application/json");
      }

      const response = await auth.handler(new Request(url, { method: request.method, headers, body }));

      reply.status(response.status);
      const setCookies = response.headers.getSetCookie();
      if (setCookies.length > 0) {
        reply.header("set-cookie", setCookies);
      }
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
      });
      return reply.send(await response.text());
    },
  });
}
