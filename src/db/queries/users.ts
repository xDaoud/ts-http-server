import { db } from "../index.js";
import { NewUser, users } from "../schema.js";
import { eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
    const [result] = await db
        .insert(users)
        .values(user)
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function createUserByEmail(email: string, hashedPassword: string) {
    const [result] = await db
        .insert(users)
        .values({ email: email, hashedPassword: hashedPassword })
        .returning();
    return result;
}

export async function deleteUsers() {
    await db.delete(users);
}

export async function getUserByEmail(email: string) {
    const [result] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
    return result;
}

export async function updateEmailAndPassword(newEmail: string, newHash: string, Id: string) {
    const [updated] = await db.update(users).set({
            hashedPassword: newHash,
            email: newEmail,
        }).where(eq(users.id, Id)).returning();
        return updated;
}