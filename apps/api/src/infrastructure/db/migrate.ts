import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../../env.js";

const main = async () => {
  const sql = postgres(env.databaseUrl, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied");
  await sql.end();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
