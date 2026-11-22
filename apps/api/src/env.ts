import "dotenv/config";

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://slotlock:slotlock@localhost:5432/slotlock",
  port: Number(process.env.PORT ?? 3000),
  betterAuthSecret: required("BETTER_AUTH_SECRET"),
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  // Optional delay (ms) applied inside the reservation transaction while the
  // rooms row lock is held, to make lock contention observable.
  reservationLockSleepMs: Number(process.env.RESERVATION_LOCK_SLEEP_MS ?? 0),
} as const;
