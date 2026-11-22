export interface Room {
  id: number;
  name: string;
  capacity: number;
  createdAt: string;
}

export type ReservationStatus = "confirmed" | "cancelled";

export interface Reservation {
  id: number;
  roomId: number;
  userId: string;
  title: string;
  attendees: number;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return body as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const api = {
  listRooms: () => request<Room[]>("/api/rooms"),
  listReservations: (roomId?: number) =>
    request<Reservation[]>(`/api/reservations${roomId ? `?roomId=${roomId}` : ""}`),
  createReservation: (input: {
    roomId: number;
    title: string;
    attendees: number;
    startAt: string;
    endAt: string;
  }) => request<Reservation>("/api/reservations", { method: "POST", body: JSON.stringify(input) }),
  cancelReservation: (id: number) =>
    request<Reservation>(`/api/reservations/${id}/cancel`, { method: "PATCH" }),
};
