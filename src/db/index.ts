import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import * as schema from "./schema.js";
import { config } from "../config.js";

const migrationClient = postgres(config.db.url, { max: 1 });

await migrate(
  drizzle(migrationClient),
  config.db.migrationConfig
);

const conn = postgres(config.db.url);
export const db = drizzle(conn, { schema });

