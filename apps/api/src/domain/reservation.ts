export type ReservationStatus = "confirmed" | "cancelled";

export interface Room {
  id: number;
  name: string;
  capacity: number;
  createdAt: Date;
}

export interface Reservation {
  id: number;
  roomId: number;
  userId: string;
  title: string;
  attendees: number;
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
  createdAt: Date;
}

/**
 * Time overlap check: two half-open intervals [aStart, aEnd) and
 * [bStart, bEnd) overlap when aStart < bEnd AND aEnd > bStart.
 */
export function overlaps(
  existing: { startAt: Date; endAt: Date },
  candidate: { startAt: Date; endAt: Date },
): boolean {
  return existing.startAt < candidate.endAt && existing.endAt > candidate.startAt;
}

export class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
