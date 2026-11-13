import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { eq, inArray } from "drizzle-orm";
import {
  authLoginAttemptsTable,
  db,
  rolesTable,
  serviceOfferingsTable,
  serviceRequestStatusHistoryTable,
  serviceRequestsTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import { hashPassword, loginRateLimitKeys } from "../src/lib/auth-security.ts";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

let admin: { id: string; cookie: string };
let employee: { id: string; cookie: string };

const cleanupUserIds: string[] = [];
const cleanupOfferingIds: string[] = [];
const cleanupRequestIds: string[] = [];
const cleanupRateKeys = new Set<string>();

let ipSequence = 140;

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
): Promise<{ id: string; cookie: string }> {
  const email = `serena-status-${randomUUID()}@example.com`;
  const password = "Fixture-Test-Passphrase-2026";

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName: `Usuario de estado ${roleId}`,
      email,
      passwordHash: await hashPassword(password),
      roleId,
      isActive: true,
      mustChangePassword: false,
    })
    .returning({ id: usersTable.id });

  cleanupUserIds.push(user.id);

  const ip = nextIp();

  for (const key of loginRateLimitKeys(email.toLowerCase(), ip)) {
    cleanupRateKeys.add(key);
  }

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { ...headers(ip), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200);

  const cookie = (response.headers.get("set-cookie") ?? "").split(";", 1)[0];

  return { id: user.id, cookie };
}

async function createOffering(): Promise<string> {
  const [offering] = await db
    .insert(serviceOfferingsTable)
    .values({
      name: `Servicio de estado ${randomBytes(4).toString("hex")}`,
      isActive: true,
    })
    .returning({ id: serviceOfferingsTable.id });

  cleanupOfferingIds.push(offering.id);

  return offering.id;
}

async function createRequest(): Promise<{ id: string; referenceCode: string }> {
  const offeringId = await createOffering();

  const response = await fetch(`${baseUrl}/api/service-requests`, {
    method: "POST",
    headers: { ...headers(nextIp()), "Content-Type": "application/json" },
    body: JSON.stringify({
      contactName: "Prueba de estados",
      contactPhone: "04121234567",
      serviceOfferingId: offeringId,
    }),
  });

  assert.equal(response.status, 201);

  const created = (await response.json()) as { referenceCode: string };

  const [stored] = await db
    .select({ id: serviceRequestsTable.id })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.referenceCode, created.referenceCode))
    .limit(1);

  cleanupRequestIds.push(stored.id);

  return { id: stored.id, referenceCode: created.referenceCode };
}

async function changeStatus(
  requestId: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}/api/admin/service-requests/${requestId}/status`, {
    method: "PATCH",
    headers: { ...headers(nextIp(), cookie), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

before(async () => {
  await db
    .insert(rolesTable)
    .values([
      { id: "administrador", description: "Administra Serena." },
      { id: "empleado", description: "Personal de Serena." },
    ])
    .onConflictDoNothing();

  server = app.listen(0);

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  admin = await createUser("administrador");
  employee = await createUser("empleado");
});

after(async () => {
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
      .delete(sessionsTable)
      .where(inArray(sessionsTable.userId, cleanupUserIds));
    await db
      .delete(authLoginAttemptsTable)
      .where(inArray(authLoginAttemptsTable.keyHash, [...cleanupRateKeys]));
    await db.delete(usersTable).where(inArray(usersTable.id, cleanupUserIds));
  }

  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

test("crear una solicitud registra el estado inicial en el historial", async () => {
  const request = await createRequest();

  const history = await db
    .select()
    .from(serviceRequestStatusHistoryTable)
    .where(eq(serviceRequestStatusHistoryTable.serviceRequestId, request.id));

  assert.equal(history.length, 1);
  assert.equal(history[0].previousStatus, null);
  assert.equal(history[0].newStatus, "pendiente");
  assert.equal(history[0].changedByUserId, null);
});

test("un cambio de estado sin sesión responde 401", async () => {
  const request = await createRequest();

  const response = await fetch(
    `${baseUrl}/api/admin/service-requests/${request.id}/status`,
    {
      method: "PATCH",
      headers: { ...headers(nextIp()), "Content-Type": "application/json" },
      body: JSON.stringify({ status: "en_revision" }),
    },
  );

  assert.equal(response.status, 401);
});

test("un empleado no puede cambiar el estado de una solicitud", async () => {
  const request = await createRequest();

  const response = await changeStatus(request.id, employee.cookie, {
    status: "en_revision",
  });

  assert.equal(response.status, 403);

  const [stored] = await db
    .select({ status: serviceRequestsTable.status })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, request.id));

  assert.equal(stored.status, "pendiente");
});

test("rechaza una transición no permitida y no modifica la solicitud", async () => {
  const request = await createRequest();

  const response = await changeStatus(request.id, admin.cookie, {
    status: "confirmada",
  });

  assert.equal(response.status, 400);

  const [stored] = await db
    .select({ status: serviceRequestsTable.status })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, request.id));

  assert.equal(stored.status, "pendiente");

  const history = await db
    .select()
    .from(serviceRequestStatusHistoryTable)
    .where(eq(serviceRequestStatusHistoryTable.serviceRequestId, request.id));

  assert.equal(history.length, 1);
});

test("el administrador avanza la solicitud y queda registrado quién lo hizo", async () => {
  const request = await createRequest();

  const toReview = await changeStatus(request.id, admin.cookie, {
    status: "en_revision",
  });
  assert.equal(toReview.status, 200);

  const confirmed = await changeStatus(request.id, admin.cookie, {
    status: "confirmada",
  });
  assert.equal(confirmed.status, 200);

  const body = (await confirmed.json()) as {
    serviceRequest: { status: string };
    history: Array<{
      previousStatus: string | null;
      newStatus: string;
      changedByUserId: string | null;
      changedByName: string | null;
    }>;
  };

  assert.equal(body.serviceRequest.status, "confirmada");
  assert.deepEqual(
    body.history.map((entry) => entry.newStatus),
    ["pendiente", "en_revision", "confirmada"],
  );
  assert.equal(body.history[1].changedByUserId, admin.id);
  assert.equal(body.history[1].changedByName, "Usuario de estado administrador");
});

test("rechazar exige un motivo y lo conserva en el historial", async () => {
  const request = await createRequest();

  await changeStatus(request.id, admin.cookie, { status: "en_revision" });

  const withoutReason = await changeStatus(request.id, admin.cookie, {
    status: "rechazada",
  });

  assert.equal(withoutReason.status, 400);

  const withReason = await changeStatus(request.id, admin.cookie, {
    status: "rechazada",
    reason: "El servicio solicitado no está disponible para esa fecha.",
  });

  assert.equal(withReason.status, 200);

  const body = (await withReason.json()) as {
    history: Array<{ newStatus: string; reason: string | null }>;
  };

  assert.equal(body.history.at(-1)?.newStatus, "rechazada");
  assert.equal(
    body.history.at(-1)?.reason,
    "El servicio solicitado no está disponible para esa fecha.",
  );
});

test("el listado de solicitudes se puede filtrar por estado", async () => {
  const request = await createRequest();

  await changeStatus(request.id, admin.cookie, { status: "en_revision" });

  const response = await fetch(
    `${baseUrl}/api/admin/service-requests?status=en_revision`,
    { headers: headers(nextIp(), admin.cookie) },
  );

  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    serviceRequests: Array<{ id: string; status: string }>;
  };

  assert.ok(body.serviceRequests.every((item) => item.status === "en_revision"));
  assert.ok(body.serviceRequests.some((item) => item.id === request.id));
});

test("una solicitud inexistente responde 404", async () => {
  const response = await changeStatus(randomUUID(), admin.cookie, {
    status: "en_revision",
  });

  assert.equal(response.status, 404);
});

test("dos cambios simultáneos no duplican el historial", async () => {
  const request = await createRequest();

  const results = await Promise.all([
    changeStatus(request.id, admin.cookie, { status: "en_revision" }),
    changeStatus(request.id, admin.cookie, { status: "en_revision" }),
  ]);

  const statuses = results.map((response) => response.status).sort();

  assert.deepEqual(statuses, [200, 400]);

  const rows = await db
    .select()
    .from(serviceRequestStatusHistoryTable)
    .where(eq(serviceRequestStatusHistoryTable.serviceRequestId, request.id));

  assert.equal(rows.length, 2);
  assert.equal(rows.filter((row) => row.newStatus === "en_revision").length, 1);
});
