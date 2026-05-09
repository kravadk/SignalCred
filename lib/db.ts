import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

function createDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in the deployment environment. " +
      "Database-backed routes will return unavailable until it is set.",
    );
  }

  return drizzle(neon(dbUrl), { schema });
}

type DbClient = ReturnType<typeof createDb>;

let cachedDb: DbClient | null = null;

export function getDb() {
  cachedDb ??= createDb();
  return cachedDb;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
