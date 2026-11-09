import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import {
  authLoginAttemptsTable,
  db,
  rolesTable,
  serviceOfferingsTable,
  serviceRequestsTable,
  serviceRequestStatusHistoryTable,
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

let admin: { id: string; email: string; password: string };
let employee: { id: string; email: string; password: string };

let ipSequence = 120;
const cleanupUserIds: string[] = [];
const cleanupOfferingIds: string[] = [];
const cleanupRequestIds: string[] = [];
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
  const email = `serena-admin-requests-${randomUUID()}@example.com`;
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

async function createRequest(
  suffix = randomUUID(),
): Promise<{ id: string; referenceCode: string; offeringId: string }> {
  const [offering] = await db
    .insert(serviceOfferingsTable)
    .values({
      name: `Servicio de prueba ${suffix}`,
      description: "Oferta creada para pruebas administrativas.",
      isActive: true,
    })
    .returning({ id: serviceOfferingsTable.id });

  cleanupOfferingIds.push(offering.id);

  const response = await fetch(`${baseUrl}/api/service-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contactName: `Solicitante ${suffix}`,
      contactPhone: "+584121234567",
      serviceOfferingId: offering.id,
      notes: `Nota de prueba ${suffix}`,
    }),
  });

  assert.equal(response.status, 201);

  const created = (await response.json()) as {
    referenceCode: string;
    status: string;
  };

  assert.equal(created.status, "pendiente");

  const [stored] = await db
    .select({ id: serviceRequestsTable.id })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.referenceCode, created.referenceCode))
    .limit(1);

  assert.ok(stored);
  cleanupRequestIds.push(stored.id);

  return {
    id: stored.id,
    referenceCode: created.referenceCode,
    offeringId: offering.id,
  };
}

before(async () => {
  await db
    .insert(rolesTable)
    .values([
      { id: "administrador", description: "Administra Serena." },
      { id: "empleado", description: "Usa las operaciones de Serena." },
    ])
    .onConflictDoNothing();

  admin = await createUser("administrador");
  employee = await createUser("empleado");

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

  if (cleanupRequestIds.length > 0) {
    await db
      .delete(serviceRequestStatusHistoryTable)
      .where(
        inArray(
          serviceRequestStatusHistoryTable.serviceRequestId,
          cleanupRequestIds,
        ),
      );

    await db
      .delete(serviceRequestsTable)
      .where(inArray(serviceRequestsTable.id, cleanupRequestIds));
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

test("listado administrativo exige autenticación y rol administrador", async () => {
  const unauthenticated = await fetch(
    `${baseUrl}/api/admin/service-requests`,
  );
  assert.equal(unauthenticated.status, 401);

  const employeeSession = await login(employee);
  const employeeResponse = await fetch(
    `${baseUrl}/api/admin/service-requests`,
    { headers: headers(employeeSession.ip, employeeSession.cookie) },
  );
  assert.equal(employeeResponse.status, 403);

  const adminSession = await login(admin);
  const adminResponse = await fetch(
    `${baseUrl}/api/admin/service-requests`,
    { headers: headers(adminSession.ip, adminSession.cookie) },
  );

  assert.equal(adminResponse.status, 200);
  assert.equal(adminResponse.headers.get("cache-control"), "no-store");
});

test("listado administrativo filtra por estado y texto", async () => {
  const suffix = randomUUID();
  const request = await createRequest(suffix);
  const session = await login(admin);

  const response = await fetch(
    `${baseUrl}/api/admin/service-requests?status=pendiente&search=${encodeURIComponent(suffix)}`,
    { headers: headers(session.ip, session.cookie) },
  );

  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    serviceRequests: Array<{
      id: string;
      status: string;
      contactName: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };

  assert.ok(body.serviceRequests.some((item) => item.id === request.id));
  assert.ok(body.serviceRequests.every((item) => item.status === "pendiente"));
  assert.equal(body.pagination.page, 1);
  assert.ok(body.pagination.total >= 1);
});

test("detalle administrativo devuelve datos e historial inicial", async () => {
  const request = await createRequest();
  const session = await login(admin);

  const response = await fetch(
    `${baseUrl}/api/admin/service-requests/${request.id}`,
    { headers: headers(session.ip, session.cookie) },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = (await response.json()) as {
    serviceRequest: {
      id: string;
      referenceCode: string;
      contactName: string;
      contactPhone: string;
      status: string;
    };
    history: Array<{
      previousStatus: string | null;
      newStatus: string;
      changedByUserId: string | null;
      changedByName: string | null;
      observation: string | null;
    }>;
  };

  assert.equal(body.serviceRequest.id, request.id);
  assert.equal(body.serviceRequest.referenceCode, request.referenceCode);
  assert.match(body.serviceRequest.contactName, /^Solicitante /);
  assert.equal(body.serviceRequest.contactPhone, "+584121234567");
  assert.equal(body.serviceRequest.status, "pendiente");

  assert.equal(body.history.length, 1);
  assert.equal(body.history[0].previousStatus, null);
  assert.equal(body.history[0].newStatus, "pendiente");
  assert.equal(body.history[0].changedByUserId, null);
  assert.equal(body.history[0].changedByName, null);
  assert.match(body.history[0].observation ?? "", /formulario público/i);
});

test("administrador cambia estado y el historial identifica al actor", async () => {
  const request = await createRequest();
  const session = await login(admin);

  const response = await fetch(
    `${baseUrl}/api/admin/service-requests/${request.id}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "en_revision",
        observation: "  Documentación recibida.  ",
      }),
    },
  );

  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    serviceRequest: { status: string };
    history: Array<{
      previousStatus: string | null;
      newStatus: string;
      changedByUserId: string | null;
      changedByName: string | null;
      observation: string | null;
    }>;
  };

  assert.equal(body.serviceRequest.status, "en_revision");
  assert.equal(body.history[0].previousStatus, "pendiente");
  assert.equal(body.history[0].newStatus, "en_revision");
  assert.equal(body.history[0].changedByUserId, admin.id);
  assert.match(body.history[0].changedByName ?? "", /administrador/i);
  assert.equal(body.history[0].observation, "Documentación recibida.");
  assert.equal(body.history.length, 2);
});

test("rechaza transiciones inválidas sin alterar el estado ni el historial", async () => {
  const request = await createRequest();
  const session = await login(admin);

  const response = await fetch(
    `${baseUrl}/api/admin/service-requests/${request.id}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "confirmada" }),
    },
  );

  assert.equal(response.status, 409);

  const [stored] = await db
    .select({
      status: serviceRequestsTable.status,
    })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, request.id))
    .limit(1);

  assert.equal(stored.status, "pendiente");

  const history = await db
    .select()
    .from(serviceRequestStatusHistoryTable)
    .where(
      eq(serviceRequestStatusHistoryTable.serviceRequestId, request.id),
    );

  assert.equal(history.length, 1);
});

test("cambio de estado requiere autenticación, rol administrador y origen válido", async () => {
  const request = await createRequest();

  const unauthenticated = await fetch(
    `${baseUrl}/api/admin/service-requests/${request.id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ status: "en_revision" }),
    },
  );
  assert.equal(unauthenticated.status, 401);

  const employeeSession = await login(employee);
  const forbidden = await fetch(
    `${baseUrl}/api/admin/service-requests/${request.id}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(employeeSession.ip, employeeSession.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "en_revision" }),
    },
  );
  assert.equal(forbidden.status, 403);

  const adminSession = await login(admin);
  const invalidOrigin = await fetch(
    `${baseUrl}/api/admin/service-requests/${request.id}/status`,
    {
      method: "PATCH",
      headers: {
        "X-Forwarded-For": nextIp(),
        Origin: "https://sitio-ajeno.example",
        Cookie: adminSession.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "en_revision" }),
    },
  );
  assert.equal(invalidOrigin.status, 403);
});

test("consulta pública de estado no expone datos personales ni historial", async () => {
  const request = await createRequest();

  const response = await fetch(
    `${baseUrl}/api/service-requests/${request.referenceCode}`,
  );

  assert.equal(response.status, 200);

  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(body.referenceCode, request.referenceCode);
  assert.equal(body.status, "pendiente");
  assert.equal("contactName" in body, false);
  assert.equal("contactPhone" in body, false);
  assert.equal("notes" in body, false);
  assert.equal("history" in body, false);
});
