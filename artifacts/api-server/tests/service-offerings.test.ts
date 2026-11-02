import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import {
  authLoginAttemptsTable,
  db,
  rolesTable,
  serviceOfferingsTable,
  usersTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  hashPassword,
  loginRateLimitKeys,
} from "../src/lib/auth-security.ts";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

let admin: { email: string; password: string };
let employee: { email: string; password: string };

let ipSequence = 80;

const cleanupUserIds: string[] = [];
const cleanupOfferingIds: string[] = [];
const cleanupRateKeys = new Set<string>();

function nextIp(): string {
  return `198.51.100.${ipSequence++}`;
}

function headers(ip: string, cookie?: string): Record<string, string> {
  const result: Record<string, string> = {
    Origin: baseUrl,
    "X-Forwarded-For": ip,
  };

  if (cookie) result.Cookie = cookie;

  return result;
}

async function createUser(
  roleId: "administrador" | "empleado",
): Promise<{ id: string; email: string; password: string }> {
  const email = `serena-catalog-${randomUUID()}@example.com`;
  const password = "Fixture-Test-Passphrase-2026";

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName: `Usuario de prueba ${roleId}`,
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

async function login(
  user: { email: string; password: string },
): Promise<{ cookie: string; ip: string }> {
  const ip = nextIp();

  for (const key of loginRateLimitKeys(user.email.toLowerCase(), ip)) {
    cleanupRateKeys.add(key);
  }

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      ...headers(ip),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  assert.equal(response.status, 200);

  const setCookie = response.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";", 1)[0];

  assert.ok(cookie.startsWith("serena_session="));

  return { cookie, ip };
}

async function createOffering(
  name: string,
  isActive: boolean,
): Promise<string> {
  const [offering] = await db
    .insert(serviceOfferingsTable)
    .values({ name, isActive })
    .returning({ id: serviceOfferingsTable.id });

  cleanupOfferingIds.push(offering.id);
  return offering.id;
}

before(async () => {
  await db
    .insert(rolesTable)
    .values([
      { id: "administrador", description: "Administra Serena." },
      { id: "empleado", description: "Usa las operaciones de Serena." },
    ])
    .onConflictDoNothing();

  const adminUser = await createUser("administrador");
  admin = { email: adminUser.email, password: adminUser.password };

  const employeeUser = await createUser("empleado");
  employee = { email: employeeUser.email, password: employeeUser.password };

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

  if (cleanupOfferingIds.length > 0) {
    await db
      .delete(serviceOfferingsTable)
      .where(inArray(serviceOfferingsTable.id, cleanupOfferingIds));
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

test("GET público devuelve solo ofertas activas", async () => {
  const suffix = randomUUID();
  const activeName = `Oferta activa ${suffix}`;
  const inactiveName = `Oferta inactiva ${suffix}`;

  await createOffering(activeName, true);
  await createOffering(inactiveName, false);

  const response = await fetch(`${baseUrl}/api/service-offerings`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = (await response.json()) as {
    serviceOfferings: Array<{ name: string; isActive: boolean }>;
  };

  assert.ok(body.serviceOfferings.some((item) => item.name === activeName));
  assert.ok(!body.serviceOfferings.some((item) => item.name === inactiveName));
  assert.ok(body.serviceOfferings.every((item) => item.isActive));
});

test("GET administrativo exige autenticación y rol administrador", async () => {
  const unauthenticated = await fetch(
    `${baseUrl}/api/admin/service-offerings`,
  );
  assert.equal(unauthenticated.status, 401);

  const employeeSession = await login(employee);
  const employeeResponse = await fetch(
    `${baseUrl}/api/admin/service-offerings`,
    { headers: headers(employeeSession.ip, employeeSession.cookie) },
  );
  assert.equal(employeeResponse.status, 403);

  const adminSession = await login(admin);
  const adminResponse = await fetch(
    `${baseUrl}/api/admin/service-offerings`,
    { headers: headers(adminSession.ip, adminSession.cookie) },
  );

  assert.equal(adminResponse.status, 200);

  const body = (await adminResponse.json()) as {
    serviceOfferings: Array<{ isActive: boolean }>;
  };

  assert.ok(body.serviceOfferings.some((item) => !item.isActive));
});

test("administrador crea una oferta y rechaza nombres duplicados", async () => {
  const session = await login(admin);
  const name = `Servicio nuevo ${randomUUID()}`;

  const createdResponse = await fetch(
    `${baseUrl}/api/admin/service-offerings`,
    {
      method: "POST",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: "Descripción de prueba",
      }),
    },
  );

  assert.equal(createdResponse.status, 201);

  const created = (await createdResponse.json()) as {
    serviceOffering: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
    };
  };

  cleanupOfferingIds.push(created.serviceOffering.id);
  assert.equal(created.serviceOffering.name, name);
  assert.equal(created.serviceOffering.description, "Descripción de prueba");
  assert.equal(created.serviceOffering.isActive, true);

  const duplicateResponse = await fetch(
    `${baseUrl}/api/admin/service-offerings`,
    {
      method: "POST",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.toUpperCase(),
      }),
    },
  );

  assert.equal(duplicateResponse.status, 409);
});

test("administrador actualiza y desactiva una oferta sin eliminarla", async () => {
  const session = await login(admin);
  const originalName = `Servicio editable ${randomUUID()}`;
  const offeringId = await createOffering(originalName, true);

  const updatedName = `Servicio actualizado ${randomUUID()}`;

  const response = await fetch(
    `${baseUrl}/api/admin/service-offerings/${offeringId}`,
    {
      method: "PATCH",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: updatedName,
        description: "Descripción actualizada",
        isActive: false,
      }),
    },
  );

  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    serviceOffering: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
    };
  };

  assert.equal(body.serviceOffering.id, offeringId);
  assert.equal(body.serviceOffering.name, updatedName);
  assert.equal(body.serviceOffering.description, "Descripción actualizada");
  assert.equal(body.serviceOffering.isActive, false);

  const publicResponse = await fetch(`${baseUrl}/api/service-offerings`);
  const publicBody = (await publicResponse.json()) as {
    serviceOfferings: Array<{ id: string }>;
  };

  assert.ok(!publicBody.serviceOfferings.some((item) => item.id === offeringId));

  const [stored] = await db
    .select({ id: serviceOfferingsTable.id })
    .from(serviceOfferingsTable)
    .where(eq(serviceOfferingsTable.id, offeringId))
    .limit(1);

  assert.ok(stored);
});

test("PATCH rechaza identificadores inválidos y cuerpos vacíos", async () => {
  const session = await login(admin);

  const invalidIdResponse = await fetch(
    `${baseUrl}/api/admin/service-offerings/no-es-un-uuid`,
    {
      method: "PATCH",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive: false }),
    },
  );

  assert.equal(invalidIdResponse.status, 400);

  const offeringId = await createOffering(
    `Oferta sin cambios ${randomUUID()}`,
    true,
  );

  const emptyBodyResponse = await fetch(
    `${baseUrl}/api/admin/service-offerings/${offeringId}`,
    {
      method: "PATCH",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  assert.equal(emptyBodyResponse.status, 400);
});
