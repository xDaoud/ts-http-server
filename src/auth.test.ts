import { describe, it, expect, beforeAll } from "vitest";
import { checkPasswordHash, hashPassword, makeJWT, validateJWT } from "./auth";

describe("JWT", () => {
  const userID1 = "43f492d1-61df-450e-950b-9c0a0c369db7";
  const userID2 = "2b7dc2ad-6403-4290-999e-bb9be6000bf4!";
  const expiresIn = 3600;
  const tokenSecret = "secret";
  let token1: string;
  let token2: string;

  beforeAll(() => {
    token1 = makeJWT(userID1, expiresIn, tokenSecret);
    token2 = makeJWT(userID2, expiresIn, tokenSecret);
  });

  it("should return the same user Id", () => {
    const result = validateJWT(token1, tokenSecret);
    expect(result).toBe(userID1);
  });


  it("should throw for wrong secret", () => {
    expect(() => validateJWT(token1, "wrong secret")).toThrow();
  });

  it("should throw for expired token", () => {
    const expiredToken = makeJWT(userID1, 0, tokenSecret);
    expect(() => validateJWT(expiredToken, tokenSecret)).toThrow();
  });
});

describe("Password Hashing", () => {
  const password1 = "correctPassword123!";
  const password2 = "anotherPassword456!";
  let hash1: string;
  let hash2: string;

  beforeAll(async () => {
    hash1 = await hashPassword(password1);
    hash2 = await hashPassword(password2);
  });

  it("should return true for the correct password", async () => {
    const result = await checkPasswordHash(password1, hash1);
    expect(result).toBe(true);
  });
});