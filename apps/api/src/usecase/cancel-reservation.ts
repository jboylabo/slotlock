import { DomainError } from "../domain/reservation.js";
import type { ReservationRepository } from "../infrastructure/repositories/reservation-repository.js";

export class CancelReservationUseCase {
  constructor(private readonly reservations: ReservationRepository) {}

  async execute(reservationId: number, userId: string) {
    const existing = await this.reservations.findById(reservationId);
    if (!existing) {
      throw new DomainError(404, `Reservation ${reservationId} not found`);
    }
    if (existing.userId !== userId) {
      throw new DomainError(403, "You can only cancel your own reservations");
    }
    const cancelled = await this.reservations.cancel(reservationId, userId);
    if (!cancelled) {
      throw new DomainError(409, "Reservation is not in a cancellable state");
    }
    return cancelled;
  }
}
