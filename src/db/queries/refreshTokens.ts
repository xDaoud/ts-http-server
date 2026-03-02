import { db } from "../index.js";
import { refreshTokens } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createRefreshToken(refreshToken: string, expiryDays: number, userId: string) {
    const expiryTime = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    const [result] = await db
        .insert(refreshTokens)
        .values({ token: refreshToken, userId: userId, expiresAt: expiryTime })
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function getRefreshToken(refreshToken: string) {
    const [result] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken));
    return result;
}

export async function updateRefreshTokenRevocationDate(refreshToken: string) {
    const currTimestamp = new Date(Date.now());
    const [updated] = await db.update(refreshTokens).set({
        revokedAt: currTimestamp,
    }).where(eq(refreshTokens.token, refreshToken)).returning();
    return updated;
}