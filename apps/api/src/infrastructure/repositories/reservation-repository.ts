import { and, asc, eq, gt, lt } from "drizzle-orm";
import type { Reservation } from "../../domain/reservation.js";
import type { Db, Tx } from "../db/client.js";
import { reservations } from "../db/schema.js";

export interface ReservationFilters {
  roomId?: number;
  /** Inclusive lower bound of start_at, e.g. the start of a day. */
  from?: Date;
  /** Exclusive upper bound of start_at. */
  to?: Date;
}

export class ReservationRepository {
  constructor(private readonly db: Db) {}

  async list(filters: ReservationFilters): Promise<Reservation[]> {
    const conditions = [
      filters.roomId !== undefined ? eq(reservations.roomId, filters.roomId) : undefined,
      filters.from !== undefined ? gt(reservations.startAt, filters.from) : undefined,
      filters.to !== undefined ? lt(reservations.startAt, filters.to) : undefined,
    ].filter((c) => c !== undefined);

    return this.db
      .select()
      .from(reservations)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(reservations.startAt));
  }

  async findById(id: number): Promise<Reservation | undefined> {
    const [row] = await this.db.select().from(reservations).where(eq(reservations.id, id));
    return row;
  }

  /**
   * Inside a transaction whose room row is already locked FOR UPDATE,
   * count confirmed reservations overlapping [startAt, endAt).
   * Overlap condition: existing.start_at < new.end_at AND existing.end_at > new.start_at
   */
  async countOverlapping(tx: Tx, roomId: number, startAt: Date, endAt: Date): Promise<number> {
    const rows = await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.roomId, roomId),
          eq(reservations.status, "confirmed"),
          lt(reservations.startAt, endAt),
          gt(reservations.endAt, startAt),
        ),
      );
    return rows.length;
  }

  async insert(
    tx: Tx,
    values: {
      roomId: number;
      userId: string;
      title: string;
      attendees: number;
      startAt: Date;
      endAt: Date;
    },
  ): Promise<Reservation> {
    const [row] = await tx.insert(reservations).values(values).returning();
    return row;
  }

  async cancel(id: number, userId: string): Promise<Reservation | undefined> {
    const [row] = await this.db
      .update(reservations)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(reservations.id, id),
          eq(reservations.userId, userId),
          eq(reservations.status, "confirmed"),
        ),
      )
      .returning();
    return row;
  }
}
