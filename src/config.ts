process.loadEnvFile()
type APIConfig = {
	fileserverHits: number;
	dbURL: string;
};
export const config: APIConfig = {
	fileserverHits: 0,
	dbURL: envOrThrow("DB_URL"),
};

function envOrThrow(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Missing environment variable: ${key}`);
	}
	return value;
}

