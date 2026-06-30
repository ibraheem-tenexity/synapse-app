import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import { eq } from "drizzle-orm";
import { users } from "./schema";

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is not set — skipping migrations");
    return;
  }

  console.log("[migrate] Running Drizzle migrations...");

  // Use a separate client for migrations (max 1 connection)
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle/migrations"),
    });
    console.log("[migrate] Migrations applied successfully");

    // Ensure demo user has the fixed known UUID for session compatibility
    await db.delete(users).where(eq(users.email, "demo@synapse.app"));
    await db
      .insert(users)
      .values({
        id: "00000000-0000-0000-0000-000000000001",
        email: "demo@synapse.app",
        displayName: "Demo User",
        passwordHash: null,
      });

    console.log("[migrate] Demo user seeded (or already present)");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    throw err;
  } finally {
    await migrationClient.end();
  }
}

// Allow running directly: tsx src/db/migrate.ts
// Also export for programmatic use
export default runMigrations;

// Auto-run when executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
