import Fastify from "fastify";
import { DomainError } from "./domain/reservation.js";
import { registerAuthRoutes } from "./presentation/routes/auth.js";
import { registerReservationRoutes } from "./presentation/routes/reservations.js";
import { registerRoomRoutes } from "./presentation/routes/rooms.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ status: "ok" }));

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  });

  registerAuthRoutes(app);
  registerRoomRoutes(app);
  registerReservationRoutes(app);

  return app;
}
