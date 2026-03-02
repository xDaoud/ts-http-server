import argon2 from "argon2";
import jwt, { JwtPayload } from "jsonwebtoken";
import { BadRequestError, UnauthorizedError } from "./errorClasses.js";
import { Request } from "express";
import crypto from 'crypto'

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
        return result;
    } catch (err) {
        throw new Error("Password verification failed", { cause: err });
    }
}

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export function makeJWT(userID: string, expiresIn: number, secret: string){
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);

    const payload: payload = {
        iss: "chirpy",
        sub: userID,
        iat: currentTimeInSeconds,
        exp: currentTimeInSeconds + expiresIn,
    }

    const token = jwt.sign(payload, secret);
    return token;
}

export function validateJWT(tokenString: string, secret: string){
    try{
    const verification = jwt.verify(tokenString, secret) as JwtPayload;
    if(verification.iss !== "chirpy"){
        throw new Error;
    }
    if(!verification.sub){
        throw new Error;
    }
    return verification.sub;
    } catch(err){
        throw new UnauthorizedError("Invalid Token! Unauthorized Access");
    }
}

export function getBearerToken(req: Request){
    const token = req.get("Authorization");
    if(!token){
        throw new UnauthorizedError("No authorization header in the request!");
    }
    return token.replace("Bearer ", "");
}

export function makeRefreshToken(){
    return crypto.randomBytes(32).toString('hex')
}