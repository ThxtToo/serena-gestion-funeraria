import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const PASSWORD_KEY_BYTES = 64;
const DUMMY_SALT = Buffer.from("serena-invalid-user-salt-v1", "utf8");

export const SESSION_COOKIE_NAME = "serena_session";
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      PASSWORD_KEY_BYTES,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) {
    throw new Error("La contraseña debe tener entre 12 y 128 caracteres.");
  }

  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  const parts = storedHash?.split("$");
  const wellFormed =
    parts?.length === 6 &&
    parts[0] === "scrypt" &&
    parts[1] === String(SCRYPT_COST) &&
    parts[2] === String(SCRYPT_BLOCK_SIZE) &&
    parts[3] === String(SCRYPT_PARALLELIZATION);

  if (!wellFormed || !parts) {
    await deriveKey(password, DUMMY_SALT);
    return false;
  }

  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expectedKey = Buffer.from(parts[5], "base64url");
    if (salt.length !== 16 || expectedKey.length !== PASSWORD_KEY_BYTES) {
      await deriveKey(password, DUMMY_SALT);
      return false;
    }

    const actualKey = await deriveKey(password, salt);
    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    await deriveKey(password, DUMMY_SALT);
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createTemporaryPassword(): string {
  return randomBytes(18).toString("base64url");
}

export function loginRateLimitKeys(email: string, ipAddress: string): string[] {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET debe estar configurado para autenticación.");
  }

  const digest = (scope: string, value: string) =>
    createHmac("sha256", secret)
      .update(`${scope}\0${value}`)
      .digest("hex");

  return [digest("email", email), digest("ip", ipAddress)];
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api",
  };
}
