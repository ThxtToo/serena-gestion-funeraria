import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  resourceAssignmentsTable,
  resourcesTable,
  rolesTable,
  serviceOfferingsTable,
  serviceRequestStatusHistoryTable,
  serviceRequestsTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import { hashPassword } from "../src/lib/auth-security.ts";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

let admin: { cookie: string };
let employee: { cookie: string };

const cleanupUserIds: string[] = [];
const cleanupResourceIds: string[] = [];
const cleanupRequestIds: string[] = [];
const cleanupOfferingIds: string[] = [];

let ipSequence = 260;

function nextIp(): string {
  return `198.51.100.${ipSequence++}`;
}

function headers(cookie?: string): Record<string, string> {
  const result: Record<string, string> = {
    Origin: baseUrl,
    "X-Forwarded-For": nextIp(),
  };

  if (cookie) result.Cookie = cookie;

  return result;
}

async function createUser(roleId: "administrador" | "empleado") {
  const email = `serena-resources-${randomUUID()}@example.com`;
  const password = "Fixture-Test-Passphrase-2026";

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName: `Usuario de recursos ${roleId}`,
      email,
      passwordHash: await hashPassword(password),
      roleId,
      isActive: true,
      mustChangePassword: false,
    })
    .returning({ id: usersTable.id });

  cleanupUserIds.push(user.id);

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200);

  return {
    cookie: (response.headers.get("set-cookie") ?? "").split(";", 1)[0],
  };
}

async function createResource(
  cookie: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; name: string }> {
  const name = `Sala ${randomBytes(4).toString("hex")}`;

  const response = await fetch(`${baseUrl}/api/admin/resources`, {
    method: "POST",
    headers: { ...headers(cookie), "Content-Type": "application/json" },
    body: JSON.stringify({ name, type: "sala", ...overrides }),
  });

  assert.equal(response.status, 201);

  const body = (await response.json()) as { resource: { id: string; name: string } };
  cleanupResourceIds.push(body.resource.id);

  return body.resource;
}

async function createRequest(): Promise<string> {
  const [offering] = await db
    .insert(serviceOfferingsTable)
    .values({
      name: `Servicio de recursos ${randomBytes(4).toString("hex")}`,
      isActive: true,
    })
    .returning({ id: serviceOfferingsTable.id });

  cleanupOfferingIds.push(offering.id);

  const response = await fetch(`${baseUrl}/api/service-requests`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      contactName: "Prueba de recursos",
      contactPhone: "04121234567",
      serviceOfferingId: offering.id,
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

  return stored.id;
}

function assign(
  cookie: string,
  requestId: string,
  body: Record<string, unknown>,
) {
  return fetch(`${baseUrl}/api/admin/service-requests/${requestId}/assignments`, {
    method: "POST",
    headers: { ...headers(cookie), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BASE = new Date("2026-12-01T14:00:00.000Z");
const inHours = (hours: number) => new Date(BASE.getTime() + hours * 3_600_000);

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
      .delete(resourceAssignmentsTable)
      .where(inArray(resourceAssignmentsTable.serviceRequestId, cleanupRequestIds));
    await db
      .delete(serviceRequestStatusHistoryTable)
      .where(inArray(serviceRequestStatusHistoryTable.serviceRequestId, cleanupRequestIds));
    await db
      .delete(serviceRequestsTable)
      .where(inArray(serviceRequestsTable.id, cleanupRequestIds));
  }

  if (cleanupResourceIds.length > 0) {
    await db
      .delete(resourcesTable)
      .where(inArray(resourcesTable.id, cleanupResourceIds));
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

test("solo la administración puede registrar recursos", async () => {
  const response = await fetch(`${baseUrl}/api/admin/resources`, {
    method: "POST",
    headers: { ...headers(employee.cookie), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Sala de prueba", type: "sala" }),
  });

  assert.equal(response.status, 403);
});

test("no se permiten dos recursos con el mismo nombre", async () => {
  const resource = await createResource(admin.cookie);

  const response = await fetch(`${baseUrl}/api/admin/resources`, {
    method: "POST",
    headers: { ...headers(admin.cookie), "Content-Type": "application/json" },
    body: JSON.stringify({ name: resource.name.toUpperCase(), type: "sala" }),
  });

  assert.equal(response.status, 409);
});

test("asignar un recurso disponible y rechazar solapamientos", async () => {
  const resource = await createResource(admin.cookie);
  const requestId = await createRequest();

  const first = await assign(employee.cookie, requestId, {
    resourceId: resource.id,
    startAt: BASE.toISOString(),
    endAt: inHours(4).toISOString(),
  });

  assert.equal(first.status, 201);

  const overlapping = await assign(employee.cookie, requestId, {
    resourceId: resource.id,
    startAt: inHours(2).toISOString(),
    endAt: inHours(6).toISOString(),
  });

  assert.equal(overlapping.status, 409);

  const later = await assign(employee.cookie, requestId, {
    resourceId: resource.id,
    startAt: inHours(5).toISOString(),
    endAt: inHours(8).toISOString(),
  });

  assert.equal(later.status, 201);
});

test("el período debe ser válido", async () => {
  const resource = await createResource(admin.cookie);
  const requestId = await createRequest();

  const response = await assign(admin.cookie, requestId, {
    resourceId: resource.id,
    startAt: inHours(4).toISOString(),
    endAt: inHours(2).toISOString(),
  });

  assert.equal(response.status, 400);
});

test("un recurso en mantenimiento no se puede asignar", async () => {
  const resource = await createResource(admin.cookie, { status: "mantenimiento" });
  const requestId = await createRequest();

  const response = await assign(admin.cookie, requestId, {
    resourceId: resource.id,
    startAt: BASE.toISOString(),
    endAt: inHours(3).toISOString(),
  });

  assert.equal(response.status, 400);
});

test("el listado indica disponibilidad según el período consultado", async () => {
  const resource = await createResource(admin.cookie);
  const requestId = await createRequest();

  await assign(admin.cookie, requestId, {
    resourceId: resource.id,
    startAt: BASE.toISOString(),
    endAt: inHours(4).toISOString(),
  });

  const busy = await fetch(
    `${baseUrl}/api/admin/resources?startAt=${encodeURIComponent(BASE.toISOString())}&endAt=${encodeURIComponent(inHours(2).toISOString())}`,
    { headers: headers(admin.cookie) },
  );

  const busyBody = (await busy.json()) as {
    resources: Array<{ id: string; available: boolean }>;
  };

  assert.equal(busyBody.resources.find((item) => item.id === resource.id)?.available, false);

  const free = await fetch(
    `${baseUrl}/api/admin/resources?startAt=${encodeURIComponent(inHours(10).toISOString())}&endAt=${encodeURIComponent(inHours(12).toISOString())}`,
    { headers: headers(admin.cookie) },
  );

  const freeBody = (await free.json()) as {
    resources: Array<{ id: string; available: boolean }>;
  };

  assert.equal(freeBody.resources.find((item) => item.id === resource.id)?.available, true);
});

test("cancelar una asignación la libera y conserva el registro", async () => {
  const resource = await createResource(admin.cookie);
  const requestId = await createRequest();

  const created = await assign(admin.cookie, requestId, {
    resourceId: resource.id,
    startAt: BASE.toISOString(),
    endAt: inHours(4).toISOString(),
  });

  const createdBody = (await created.json()) as { assignment: { id: string } };

  const cancelled = await fetch(
    `${baseUrl}/api/admin/resource-assignments/${createdBody.assignment.id}/cancel`,
    {
      method: "PATCH",
      headers: { ...headers(admin.cookie), "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "La familia cambió la fecha." }),
    },
  );

  assert.equal(cancelled.status, 200);

  const cancelledBody = (await cancelled.json()) as {
    assignment: { status: string; cancellationReason: string | null };
  };

  assert.equal(cancelledBody.assignment.status, "cancelada");
  assert.equal(cancelledBody.assignment.cancellationReason, "La familia cambió la fecha.");

  const again = await assign(admin.cookie, requestId, {
    resourceId: resource.id,
    startAt: BASE.toISOString(),
    endAt: inHours(4).toISOString(),
  });

  assert.equal(again.status, 201);

  const [stored] = await db
    .select({ status: resourceAssignmentsTable.status })
    .from(resourceAssignmentsTable)
    .where(eq(resourceAssignmentsTable.id, createdBody.assignment.id));

  assert.equal(stored.status, "cancelada");
});

test("dos asignaciones simultáneas del mismo recurso no se superponen", async () => {
  const resource = await createResource(admin.cookie);
  const requestId = await createRequest();

  const responses = await Promise.all([
    assign(admin.cookie, requestId, {
      resourceId: resource.id,
      startAt: BASE.toISOString(),
      endAt: inHours(4).toISOString(),
    }),
    assign(admin.cookie, requestId, {
      resourceId: resource.id,
      startAt: BASE.toISOString(),
      endAt: inHours(4).toISOString(),
    }),
  ]);

  const statuses = responses.map((response) => response.status).sort();

  assert.deepEqual(statuses, [201, 409]);

  const rows = await db
    .select({ id: resourceAssignmentsTable.id })
    .from(resourceAssignmentsTable)
    .where(
      eq(resourceAssignmentsTable.resourceId, resource.id),
    );

  assert.equal(rows.length, 1);
});
