import argon2 from "argon2";

export async function hashPassword(password: string) {
    try {
        return await argon2.hash(password);;
    } catch (err) {
        throw new Error("Failed to hash password", { cause: err });
    }
}

export async function checkPasswordHash(password: string, hash: string) {
    try {
        const result = await argon2.verify(hash, password);
        console.log("Direct verification result:", result);
        return result;
    } catch (err) {
        throw new Error("Password verification failed", { cause: err });
    }
}