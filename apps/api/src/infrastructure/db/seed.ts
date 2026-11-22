import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../../env.js";
import { rooms } from "./schema.js";

const ROOM_SEED = [
  { name: "Room A", capacity: 10 },
  { name: "Room B", capacity: 6 },
  { name: "Focus Booth 1", capacity: 2 },
  { name: "Focus Booth 2", capacity: 2 },
] as const;

const main = async () => {
  const sql = postgres(env.databaseUrl, { max: 1 });
  const db = drizzle(sql);
  await db.insert(rooms).values([...ROOM_SEED]).onConflictDoNothing();
  console.log(`Seeded ${ROOM_SEED.length} rooms`);
  await sql.end();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
