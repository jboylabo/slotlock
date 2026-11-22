import { asc, eq } from "drizzle-orm";
import type { Room } from "../../domain/reservation.js";
import type { Db, Tx } from "../db/client.js";
import { rooms } from "../db/schema.js";

export class RoomRepository {
  constructor(private readonly db: Db) {}

  async listAll(): Promise<Room[]> {
    return this.db.select().from(rooms).orderBy(asc(rooms.id));
  }

  /** Lock the room row with SELECT ... FOR UPDATE inside a transaction. */
  async lockById(tx: Tx, roomId: number): Promise<Room | undefined> {
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
    return room;
  }
}
