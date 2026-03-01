import { db } from "../index.js";
import { chirps } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createChirp(body: string, userId: string) {
    const [result] = await db
        .insert(chirps)
        .values({ body: body, userId: userId })
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function getAllChirps() {
    const result = await db.select().from(chirps).orderBy(chirps.createdAt);
    return result;
}

export async function getChirpById(id: string) {
    const [result] = await db.select().from(chirps).where(eq(chirps.id, id));
    return result;
}