import { DomainError } from "../domain/reservation.js";
import type { Db } from "../infrastructure/db/client.js";
import type { ReservationRepository } from "../infrastructure/repositories/reservation-repository.js";
import type { RoomRepository } from "../infrastructure/repositories/room-repository.js";

export interface CreateReservationInput {
  roomId: number;
  userId: string;
  title: string;
  attendees: number;
  startAt: Date;
  endAt: Date;
  /** Optional delay (ms) while holding the lock, for observing contention. */
  lockSleepMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a reservation while preventing double-booking:
 * the room row is locked with SELECT ... FOR UPDATE so concurrent
 * bookings for the same room serialize; the second request then sees
 * the first reservation in the overlap check and fails with 409.
 */
export class CreateReservationUseCase {
  constructor(
    private readonly db: Db,
    private readonly rooms: RoomRepository,
    private readonly reservations: ReservationRepository,
  ) {}

  async execute(input: CreateReservationInput) {
    if (!(input.startAt < input.endAt)) {
      throw new DomainError(400, "startAt must be before endAt");
    }
    if (input.startAt < new Date()) {
      throw new DomainError(400, "startAt must not be in the past");
    }
    if (input.attendees < 1) {
      throw new DomainError(400, "attendees must be at least 1");
    }

    return this.db.transaction(async (tx) => {
      // Lock the parent room row: serializes concurrent bookings of this room.
      const room = await this.rooms.lockById(tx, input.roomId);
      if (!room) {
        throw new DomainError(404, `Room ${input.roomId} not found`);
      }
      if (input.attendees > room.capacity) {
        throw new DomainError(400, `attendees (${input.attendees}) exceeds room capacity (${room.capacity})`);
      }

      if (input.lockSleepMs && input.lockSleepMs > 0) {
        await sleep(input.lockSleepMs);
      }

      const overlapping = await this.reservations.countOverlapping(
        tx,
        input.roomId,
        input.startAt,
        input.endAt,
      );
      if (overlapping > 0) {
        throw new DomainError(409, "The room is already booked for that time slot");
      }

      return this.reservations.insert(tx, {
        roomId: input.roomId,
        userId: input.userId,
        title: input.title,
        attendees: input.attendees,
        startAt: input.startAt,
        endAt: input.endAt,
      });
    });
  }
}
