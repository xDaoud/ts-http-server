import { db } from "../index.js";
import { NewUser, users } from "../schema.js";

export async function createUser(user: NewUser) {
    const [result] = await db
        .insert(users)
        .values(user)
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function createUserByEmail(email: string) {
    const [result] = await db
        .insert(users)
        .values({ email: email })
        .returning();
    return result;
}

export async function deleteUsers() {
    await db.delete(users);
}