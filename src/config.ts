import { MigrationConfig } from "drizzle-orm/migrator";

process.loadEnvFile()
type APIConfig = {
	fileserverHits: number;
	platform: string;
};


function envOrThrow(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing environment variable: ${key}`);
	}
	return value;
}

type DBConfig = {
	url: string;
	migrationConfig: MigrationConfig;
};

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

export const config: {
  api: APIConfig;
  db: DBConfig;
} = {
  api: {
    fileserverHits: 0,
	platform: envOrThrow("PLATFORM"),
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig,
  },
};