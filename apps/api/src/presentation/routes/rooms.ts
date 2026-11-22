import type { FastifyInstance } from "fastify";
import { RoomRepository } from "../../infrastructure/repositories/room-repository.js";
import { db } from "../../infrastructure/db/client.js";
import { requireAuth } from "../plugins/auth.js";

export function registerRoomRoutes(app: FastifyInstance) {
  const rooms = new RoomRepository(db);

  app.get("/api/rooms", { onRequest: requireAuth }, async () => {
    return rooms.listAll();
  });
}
