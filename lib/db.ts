import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local. " +
    "Without it the entire API surface fails on startup.",
  );
}
const sql = neon(dbUrl);
export const db = drizzle(sql, { schema });
