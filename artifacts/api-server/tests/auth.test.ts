import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { and, eq, inArray } from "drizzle-orm";
import {
  authLoginAttemptsTable,
  db,
  rolesTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import {
  hashPassword,
  hashSessionToken,
  loginRateLimitKeys,
} from "../src/lib/auth-security.ts";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let admin: { id: string; email: string; password: string };
let employee: { id: string; email: string; password: string };
let ipSequence = 20;
const cleanupUserIds: string[] = [];
const cleanupRateKeys = new Set<string>();

function nextTestIp(): string {
  const ip = `198.51.100.${ipSequence++}`;
  return ip;
}

function requestHeaders(ip: string, cookie?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Origin: baseUrl,
    "X-Forwarded-For": ip,
  };
  if (cookie) headers.Cookie = cookie;
  return headers;
}

async function login(
  email: string,
  password: string,
  ip: string,
): Promise<{ response: Response; cookie: string }> {
  for (const key of loginRateLimitKeys(email.trim().toLowerCase(), ip)) {
    cleanupRateKeys.add(key);
  }
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      ...requestHeaders(ip),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";", 1)[0];
  return { response, cookie };
}

async function createFixtureUser(
  fullName: string,
  roleId: "administrador" | "empleado",
): Promise<{ id: string; email: string; password: string }> {
  const email = `serena-test-${randomUUID()}@example.com`;
  const password = "Fixture-Test-Passphrase-2026";
  const [user] = await db
    .insert(usersTable)
    .values({
      fullName,
      email,
      passwordHash: await hashPassword(password),
      roleId,
      isActive: true,
      mustChangePassword: false,
    })
    .returning({ id: usersTable.id });
  cleanupUserIds.push(user.id);
  return { id: user.id, email, password };
}

before(async () => {
  await db
    .insert(rolesTable)
    .values([
      {
        id: "administrador",
        description: "Administra Serena.",
      },
      {
        id: "empleado",
        description: "Usa las operaciones de Serena.",
      },
    ])
    .onConflictDoNothing();

  admin = await createFixtureUser("Administrador de prueba", "administrador");
  employee = await createFixtureUser("Empleado de prueba", "empleado");

  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  if (cleanupUserIds.length > 0) {
    await db
      .delete(usersTable)
      .where(inArray(usersTable.id, cleanupUserIds));
  }
  if (cleanupRateKeys.size > 0) {
    await db
      .delete(authLoginAttemptsTable)
      .where(inArray(authLoginAttemptsTable.keyHash, [...cleanupRateKeys]));
  }
});

test("login creates an HttpOnly session and logout revokes it", async () => {
  const ip = nextTestIp();
  const { response, cookie } = await login(admin.email, admin.password, ip);
  assert.equal(response.status, 200);
  assert.ok(cookie.startsWith("serena_session="));
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Path=\/api/i);
  if (process.env.NODE_ENV === "production") {
    assert.match(setCookie, /Secure/i);
  }

  const signedIn = await fetch(`${baseUrl}/api/auth/session`, {
    headers: requestHeaders(ip, cookie),
  });
  assert.equal(signedIn.status, 200);
  const session = (await signedIn.json()) as {
    user: { id: string; role: string };
    createdAt: string;
    expiresAt: string;
  };
  assert.equal(session.user.id, admin.id);
  assert.equal(session.user.role, "administrador");
  assert.equal(
    new Date(session.expiresAt).getTime() - new Date(session.createdAt).getTime(),
    8 * 60 * 60 * 1000,
  );

  const rawToken = cookie.slice("serena_session=".length);
  const tokenHash = hashSessionToken(rawToken);
  const [storedBeforeLogout] = await db
    .select({ tokenHash: sessionsTable.tokenHash })
    .from(sessionsTable)
    .where(eq(sessionsTable.tokenHash, tokenHash))
    .limit(1);
  assert.equal(storedBeforeLogout.tokenHash, tokenHash);
  assert.notEqual(storedBeforeLogout.tokenHash, rawToken);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: requestHeaders(ip, cookie),
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") ?? "", /serena_session=;/);

  const [storedSession] = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(eq(sessionsTable.tokenHash, tokenHash))
    .limit(1);
  assert.equal(storedSession, undefined);

  const signedOut = await fetch(`${baseUrl}/api/auth/session`, {
    headers: requestHeaders(ip, cookie),
  });
  assert.equal(signedOut.status, 401);
});

test("idle and absolute session expiry both revoke access", async () => {
  const ip = nextTestIp();
  let { response, cookie } = await login(admin.email, admin.password, ip);
  assert.equal(response.status, 200);

  const tokenHash = hashSessionToken(
    cookie.slice("serena_session=".length),
  );
  await db
    .update(sessionsTable)
    .set({ lastActivityAt: new Date(Date.now() - 31 * 60 * 1000) })
    .where(eq(sessionsTable.tokenHash, tokenHash));

  response = await fetch(`${baseUrl}/api/auth/session`, {
    headers: requestHeaders(ip, cookie),
  });
  assert.equal(response.status, 401);

  ({ response, cookie } = await login(admin.email, admin.password, ip));
  assert.equal(response.status, 200);
  const secondTokenHash = hashSessionToken(
    cookie.slice("serena_session=".length),
  );
  await db
    .update(sessionsTable)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(sessionsTable.tokenHash, secondTokenHash));

  response = await fetch(`${baseUrl}/api/auth/session`, {
    headers: requestHeaders(ip, cookie),
  });
  assert.equal(response.status, 401);
});

test("employee role cannot access administrator routes", async () => {
  const ip = nextTestIp();
  const unauthenticated = await fetch(`${baseUrl}/api/admin/users`);
  assert.equal(unauthenticated.status, 401);

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: employee.email,
      password: employee.password,
    }),
  });
  assert.equal(registration.status, 404);

  const { response, cookie } = await login(
    employee.email,
    employee.password,
    ip,
  );
  assert.equal(response.status, 200);

  const listing = await fetch(`${baseUrl}/api/admin/users`, {
    headers: requestHeaders(ip, cookie),
  });
  assert.equal(listing.status, 403);

  const creation = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      ...requestHeaders(ip, cookie),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `unauthorized-${randomUUID()}@example.com`,
      fullName: "No autorizado",
    }),
  });
  assert.equal(creation.status, 403);
});

test("administrator creates, forces password change, and deactivates employees", async () => {
  const ip = nextTestIp();
  const adminLogin = await login(admin.email, admin.password, ip);
  assert.equal(adminLogin.response.status, 200);

  const newEmail = `serena-employee-${randomUUID()}@example.com`;
  const createdResponse = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      ...requestHeaders(ip, adminLogin.cookie),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: newEmail, fullName: "Nuevo empleado" }),
  });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()) as {
    employee: { id: string; role: string; mustChangePassword: boolean };
    temporaryPassword: string;
  };
  cleanupUserIds.push(created.employee.id);
  assert.equal(created.employee.role, "empleado");
  assert.equal(created.employee.mustChangePassword, true);
  assert.ok(created.temporaryPassword.length >= 20);

  const [storedEmployee] = await db
    .select({ passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, created.employee.id))
    .limit(1);
  assert.notEqual(storedEmployee.passwordHash, created.temporaryPassword);
  assert.match(storedEmployee.passwordHash, /^scrypt\$/);

  const employeeIp = nextTestIp();
  const firstLogin = await login(
    newEmail,
    created.temporaryPassword,
    employeeIp,
  );
  assert.equal(firstLogin.response.status, 200);
  const firstLoginData = (await firstLogin.response.json()) as {
    user: { mustChangePassword: boolean };
  };
  assert.equal(firstLoginData.user.mustChangePassword, true);

  const blocked = await fetch(`${baseUrl}/api/admin/users`, {
    headers: requestHeaders(employeeIp, firstLogin.cookie),
  });
  assert.equal(blocked.status, 403);

  const secondEmployeeIp = nextTestIp();
  const secondSession = await login(
    newEmail,
    created.temporaryPassword,
    secondEmployeeIp,
  );
  assert.equal(secondSession.response.status, 200);

  const newPassword = "New-Employee-Passphrase-2026";
  const changed = await fetch(`${baseUrl}/api/auth/password`, {
    method: "PATCH",
    headers: {
      ...requestHeaders(employeeIp, firstLogin.cookie),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentPassword: created.temporaryPassword,
      newPassword,
    }),
  });
  assert.equal(changed.status, 200);
  const changedData = (await changed.json()) as {
    mustChangePassword: boolean;
  };
  assert.equal(changedData.mustChangePassword, false);

  const currentSession = await fetch(`${baseUrl}/api/auth/session`, {
    headers: requestHeaders(employeeIp, firstLogin.cookie),
  });
  assert.equal(currentSession.status, 200);
  const otherSession = await fetch(`${baseUrl}/api/auth/session`, {
    headers: requestHeaders(secondEmployeeIp, secondSession.cookie),
  });
  assert.equal(otherSession.status, 401);

  const deactivated = await fetch(
    `${baseUrl}/api/admin/users/${created.employee.id}/active`,
    {
      method: "PATCH",
      headers: {
        ...requestHeaders(ip, adminLogin.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive: false }),
    },
  );
  assert.equal(deactivated.status, 200);

  const revoked = await fetch(`${baseUrl}/api/auth/session`, {
    headers: requestHeaders(employeeIp, firstLogin.cookie),
  });
  assert.equal(revoked.status, 401);

  const inactiveLogin = await login(newEmail, newPassword, employeeIp);
  assert.equal(inactiveLogin.response.status, 401);
});

test("cross-origin sign-in is rejected and repeated failures are throttled", async () => {
  const ip = nextTestIp();
  const email = `unknown-${randomUUID()}@example.com`;
  cleanupRateKeys.add(loginRateLimitKeys(email, ip)[0]);
  cleanupRateKeys.add(loginRateLimitKeys(email, ip)[1]);

  const crossOrigin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      Origin: "https://attacker.example",
      "X-Forwarded-For": ip,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: "Incorrect-Passphrase" }),
  });
  assert.equal(crossOrigin.status, 403);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await login(email, "Incorrect-Passphrase", ip);
    assert.equal(result.response.status, 401);
  }
  const throttled = await login(email, "Incorrect-Passphrase", ip);
  assert.equal(throttled.response.status, 429);

  const rateRows = await db
    .select({ keyHash: authLoginAttemptsTable.keyHash })
    .from(authLoginAttemptsTable)
    .where(
      and(
        inArray(authLoginAttemptsTable.keyHash, [
          ...cleanupRateKeys,
        ]),
        eq(authLoginAttemptsTable.failureCount, 5),
      ),
    );
  assert.ok(rateRows.length >= 1);
});
