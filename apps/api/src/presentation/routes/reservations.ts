import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../env.js";
import { db } from "../../infrastructure/db/client.js";
import { ReservationRepository } from "../../infrastructure/repositories/reservation-repository.js";
import { RoomRepository } from "../../infrastructure/repositories/room-repository.js";
import { CancelReservationUseCase } from "../../usecase/cancel-reservation.js";
import { CreateReservationUseCase } from "../../usecase/create-reservation.js";
import { requireAuth } from "../plugins/auth.js";

const listQuerySchema = z.object({
  roomId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const createBodySchema = z.object({
  roomId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  attendees: z.number().int().min(1),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export function registerReservationRoutes(app: FastifyInstance) {
  const rooms = new RoomRepository(db);
  const reservations = new ReservationRepository(db);
  const createReservation = new CreateReservationUseCase(db, rooms, reservations);
  const cancelReservation = new CancelReservationUseCase(reservations);

  app.get("/api/reservations", { onRequest: requireAuth }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query parameters", issues: parsed.error.issues });
    }
    const { roomId, date } = parsed.data;
    let from: Date | undefined;
    let to: Date | undefined;
    if (date) {
      from = new Date(`${date}T00:00:00Z`);
      to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    }
    return reservations.list({ roomId, from, to });
  });

  app.post("/api/reservations", { onRequest: requireAuth }, async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request body", issues: parsed.error.issues });
    }
    const { roomId, title, attendees, startAt, endAt } = parsed.data;
    const created = await createReservation.execute({
      roomId,
      userId: request.currentUser!.id,
      title,
      attendees,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      lockSleepMs: env.reservationLockSleepMs,
    });
    return reply.status(201).send(created);
  });

  app.patch("/api/reservations/:id/cancel", { onRequest: requireAuth }, async (request, reply) => {
    const parsed = idParamSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid reservation id" });
    }
    const cancelled = await cancelReservation.execute(parsed.data.id, request.currentUser!.id);
    return reply.status(200).send(cancelled);
  });
}
