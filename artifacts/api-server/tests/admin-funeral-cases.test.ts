import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import {
  authLoginAttemptsTable,
  db,
  funeralCasesTable,
  funeralCaseStatusHistoryTable,
  rolesTable,
  serviceOfferingsTable,
  serviceRequestsTable,
  serviceRequestStatusHistoryTable,
  usersTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { hashPassword, loginRateLimitKeys } from "../src/lib/auth-security.ts";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

let admin: { id: string; email: string; password: string };
let employee: { id: string; email: string; password: string };

let ipSequence = 150;
const cleanupUserIds: string[] = [];
const cleanupOfferingIds: string[] = [];
const cleanupRequestIds: string[] = [];
const cleanupCaseIds: string[] = [];
const cleanupRateKeys = new Set<string>();

function nextIp() {
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

async function createUser(roleId: "administrador" | "empleado") {
  const email = `serena-funeral-cases-${randomUUID()}@example.com`;
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

async function login(user: { email: string; password: string }) {
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

async function createRequest() {
  const suffix = randomUUID();

  const [offering] = await db
    .insert(serviceOfferingsTable)
    .values({
      name: `Servicio de prueba ${suffix}`,
      description: "Oferta creada para pruebas de expedientes.",
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
      notes: `Solicitud de prueba ${suffix}`,
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
  };
}

async function confirmRequest(requestId: string) {
  await db
    .update(serviceRequestsTable)
    .set({ status: "confirmada" })
    .where(eq(serviceRequestsTable.id, requestId));
}

function caseInput(
  serviceRequestId: string,
  assignedEmployeeId?: string,
) {
  return {
    serviceRequestId,
    deceasedFullName: "Persona fallecida de prueba",
    deceasedDateOfDeath: "2026-10-15T12:00:00.000Z",
    serviceLocation: "Caracas",
    responsibleContactName: "Contacto responsable de prueba",
    responsibleContactPhone: "+584121234567",
    ...(assignedEmployeeId ? { assignedEmployeeId } : {}),
    notes: "Expediente creado durante las pruebas automatizadas.",
  };
}

async function createCase(
  requestId: string,
  session: { cookie: string; ip: string },
  assignedEmployeeId?: string,
) {
  const response = await fetch(`${baseUrl}/api/admin/funeral-cases`, {
    method: "POST",
    headers: {
      ...headers(session.ip, session.cookie),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(caseInput(requestId, assignedEmployeeId)),
  });

  return response;
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
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (cleanupCaseIds.length > 0) {
    await db
      .delete(funeralCaseStatusHistoryTable)
      .where(inArray(funeralCaseStatusHistoryTable.funeralCaseId, cleanupCaseIds));

    await db
      .delete(funeralCasesTable)
      .where(inArray(funeralCasesTable.id, cleanupCaseIds));
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
      .where(
        inArray(authLoginAttemptsTable.keyHash, [...cleanupRateKeys]),
      );
  }
});

test("consulta de expedientes exige autenticación y rol administrador", async () => {
  const unauthenticated = await fetch(
    `${baseUrl}/api/admin/funeral-cases`,
  );
  assert.equal(unauthenticated.status, 401);

  const employeeSession = await login(employee);
  const forbidden = await fetch(
    `${baseUrl}/api/admin/funeral-cases`,
    { headers: headers(employeeSession.ip, employeeSession.cookie) },
  );
  assert.equal(forbidden.status, 403);

  const adminSession = await login(admin);
  const allowed = await fetch(
    `${baseUrl}/api/admin/funeral-cases`,
    { headers: headers(adminSession.ip, adminSession.cookie) },
  );

  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("cache-control"), "no-store");
});

test("no permite crear un expediente desde una solicitud no confirmada", async () => {
  const request = await createRequest();
  const session = await login(admin);

  const response = await createCase(request.id, session);

  assert.equal(response.status, 409);

  const storedCases = await db
    .select()
    .from(funeralCasesTable)
    .where(eq(funeralCasesTable.serviceRequestId, request.id));

  assert.equal(storedCases.length, 0);
});

test("crea expediente desde solicitud confirmada y registra historial inicial", async () => {
  const request = await createRequest();
  await confirmRequest(request.id);

  const session = await login(admin);
  const response = await createCase(
    request.id,
    session,
    employee.id,
  );

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = (await response.json()) as {
    funeralCase: {
      id: string;
      caseNumber: string;
      serviceRequestId: string;
      serviceRequestReferenceCode: string;
      deceasedFullName: string;
      responsibleContactName: string;
      assignedEmployeeId: string | null;
      assignedEmployeeName: string | null;
      status: string;
      createdByUserId: string;
    };
    history: Array<{
      previousStatus: string | null;
      newStatus: string;
      changedByUserId: string;
      changedByName: string;
      observation: string | null;
    }>;
  };

  const created = body.funeralCase;
  cleanupCaseIds.push(created.id);

  assert.match(created.caseNumber, /^EXP-\d{4}-[A-F0-9]{8}$/);
  assert.equal(created.serviceRequestId, request.id);
  assert.equal(created.serviceRequestReferenceCode, request.referenceCode);
  assert.equal(created.deceasedFullName, "Persona fallecida de prueba");
  assert.equal(created.responsibleContactName, "Contacto responsable de prueba");
  assert.equal(created.assignedEmployeeId, employee.id);
  assert.match(created.assignedEmployeeName ?? "", /empleado/i);
  assert.equal(created.status, "abierto");
  assert.equal(created.createdByUserId, admin.id);

  assert.equal(body.history.length, 1);
  assert.equal(body.history[0].previousStatus, null);
  assert.equal(body.history[0].newStatus, "abierto");
  assert.equal(body.history[0].changedByUserId, admin.id);
  assert.match(body.history[0].changedByName, /administrador/i);

  const [storedRequest] = await db
    .select({ status: serviceRequestsTable.status })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, request.id));

  assert.equal(storedRequest.status, "confirmada");
});

test("impide crear dos expedientes para una misma solicitud", async () => {
  const request = await createRequest();
  await confirmRequest(request.id);

  const session = await login(admin);
  const first = await createCase(request.id, session);

  assert.equal(first.status, 201);

  const firstBody = (await first.json()) as {
    funeralCase: { id: string };
  };
  cleanupCaseIds.push(firstBody.funeralCase.id);

  const duplicate = await createCase(request.id, session);
  assert.equal(duplicate.status, 409);
});

test("rechaza asignar un usuario que no tenga rol de empleado", async () => {
  const request = await createRequest();
  await confirmRequest(request.id);

  const session = await login(admin);
  const response = await createCase(request.id, session, admin.id);

  assert.equal(response.status, 400);

  const storedCases = await db
    .select()
    .from(funeralCasesTable)
    .where(eq(funeralCasesTable.serviceRequestId, request.id));

  assert.equal(storedCases.length, 0);
});

test("consulta detalle, filtros y búsqueda de expedientes", async () => {
  const request = await createRequest();
  await confirmRequest(request.id);

  const session = await login(admin);
  const createdResponse = await createCase(request.id, session);

  assert.equal(createdResponse.status, 201);

  const createdBody = (await createdResponse.json()) as {
    funeralCase: { id: string; caseNumber: string };
  };

  const caseId = createdBody.funeralCase.id;
  cleanupCaseIds.push(caseId);

  const detailResponse = await fetch(
    `${baseUrl}/api/admin/funeral-cases/${caseId}`,
    { headers: headers(session.ip, session.cookie) },
  );

  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.headers.get("cache-control"), "no-store");

  const detail = (await detailResponse.json()) as {
    funeralCase: { id: string; status: string };
    history: Array<{ newStatus: string }>;
  };

  assert.equal(detail.funeralCase.id, caseId);
  assert.equal(detail.funeralCase.status, "abierto");
  assert.equal(detail.history.length, 1);

  const listResponse = await fetch(
    `${baseUrl}/api/admin/funeral-cases?status=abierto&search=${encodeURIComponent(createdBody.funeralCase.caseNumber)}`,
    { headers: headers(session.ip, session.cookie) },
  );

  assert.equal(listResponse.status, 200);

  const list = (await listResponse.json()) as {
    funeralCases: Array<{ id: string; status: string }>;
    pagination: { page: number; total: number };
  };

  assert.ok(list.funeralCases.some((item) => item.id === caseId));
  assert.ok(list.funeralCases.every((item) => item.status === "abierto"));
  assert.equal(list.pagination.page, 1);
  assert.ok(list.pagination.total >= 1);
});

test("cambia estado y registra actor, estado anterior y observación", async () => {
  const request = await createRequest();
  await confirmRequest(request.id);

  const session = await login(admin);
  const createdResponse = await createCase(request.id, session);

  assert.equal(createdResponse.status, 201);

  const createdBody = (await createdResponse.json()) as {
    funeralCase: { id: string };
  };

  const caseId = createdBody.funeralCase.id;
  cleanupCaseIds.push(caseId);

  const response = await fetch(
    `${baseUrl}/api/admin/funeral-cases/${caseId}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "en_preparacion",
        observation: "  Preparación iniciada.  ",
      }),
    },
  );

  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    funeralCase: { status: string };
    history: Array<{
      previousStatus: string | null;
      newStatus: string;
      changedByUserId: string;
      changedByName: string;
      observation: string | null;
    }>;
  };

  assert.equal(body.funeralCase.status, "en_preparacion");
  assert.equal(body.history.length, 2);

  const change = body.history.find(
    (entry) => entry.newStatus === "en_preparacion",
  );

  assert.ok(change);
  assert.equal(change.previousStatus, "abierto");
  assert.equal(change.changedByUserId, admin.id);
  assert.match(change.changedByName, /administrador/i);
  assert.equal(change.observation, "Preparación iniciada.");
});

test("rechaza transiciones inválidas sin alterar estado ni historial", async () => {
  const request = await createRequest();
  await confirmRequest(request.id);

  const session = await login(admin);
  const createdResponse = await createCase(request.id, session);

  assert.equal(createdResponse.status, 201);

  const createdBody = (await createdResponse.json()) as {
    funeralCase: { id: string };
  };

  const caseId = createdBody.funeralCase.id;
  cleanupCaseIds.push(caseId);

  const response = await fetch(
    `${baseUrl}/api/admin/funeral-cases/${caseId}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(session.ip, session.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "finalizado" }),
    },
  );

  assert.equal(response.status, 409);

  const [stored] = await db
    .select({ status: funeralCasesTable.status })
    .from(funeralCasesTable)
    .where(eq(funeralCasesTable.id, caseId));

  assert.equal(stored.status, "abierto");

  const history = await db
    .select()
    .from(funeralCaseStatusHistoryTable)
    .where(eq(funeralCaseStatusHistoryTable.funeralCaseId, caseId));

  assert.equal(history.length, 1);
});

test("el cambio de estado requiere administrador y origen válido", async () => {
  const request = await createRequest();
  await confirmRequest(request.id);

  const adminSession = await login(admin);
  const createdResponse = await createCase(request.id, adminSession);

  assert.equal(createdResponse.status, 201);

  const createdBody = (await createdResponse.json()) as {
    funeralCase: { id: string };
  };

  const caseId = createdBody.funeralCase.id;
  cleanupCaseIds.push(caseId);

  const unauthenticated = await fetch(
    `${baseUrl}/api/admin/funeral-cases/${caseId}/status`,
    {
      method: "PATCH",
      headers: {
        Origin: baseUrl,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "en_preparacion" }),
    },
  );

  assert.equal(unauthenticated.status, 401);

  const employeeSession = await login(employee);
  const forbidden = await fetch(
    `${baseUrl}/api/admin/funeral-cases/${caseId}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(employeeSession.ip, employeeSession.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "en_preparacion" }),
    },
  );

  assert.equal(forbidden.status, 403);

  const invalidOrigin = await fetch(
    `${baseUrl}/api/admin/funeral-cases/${caseId}/status`,
    {
      method: "PATCH",
      headers: {
        "X-Forwarded-For": nextIp(),
        Origin: "https://sitio-ajeno.example",
        Cookie: adminSession.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "en_preparacion" }),
    },
  );

  assert.equal(invalidOrigin.status, 403);
});

test("el empleado solo consulta expedientes que tiene asignados", async () => {
  const otherEmployee = await createUser("empleado");
  const ownRequest = await createRequest();
  const otherRequest = await createRequest();
  await confirmRequest(ownRequest.id);
  await confirmRequest(otherRequest.id);

  const adminSession = await login(admin);

  const ownCreated = await createCase(
    ownRequest.id,
    adminSession,
    employee.id,
  );
  const otherCreated = await createCase(
    otherRequest.id,
    adminSession,
    otherEmployee.id,
  );

  assert.equal(ownCreated.status, 201);
  assert.equal(otherCreated.status, 201);

  const ownBody = (await ownCreated.json()) as {
    funeralCase: { id: string; caseNumber: string };
  };
  const otherBody = (await otherCreated.json()) as {
    funeralCase: { id: string };
  };

  const ownCaseId = ownBody.funeralCase.id;
  const otherCaseId = otherBody.funeralCase.id;
  cleanupCaseIds.push(ownCaseId, otherCaseId);

  const employeeSession = await login(employee);

  const listResponse = await fetch(
    `${baseUrl}/api/employee/funeral-cases?search=${encodeURIComponent(ownBody.funeralCase.caseNumber)}`,
    { headers: headers(employeeSession.ip, employeeSession.cookie) },
  );

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.headers.get("cache-control"), "no-store");

  const list = (await listResponse.json()) as {
    funeralCases: Array<{ id: string }>;
    pagination: { total: number };
  };

  assert.ok(list.funeralCases.some((item) => item.id === ownCaseId));
  assert.ok(list.funeralCases.every((item) => item.id !== otherCaseId));
  assert.equal(list.pagination.total, 1);

  const ownDetail = await fetch(
    `${baseUrl}/api/employee/funeral-cases/${ownCaseId}`,
    { headers: headers(employeeSession.ip, employeeSession.cookie) },
  );
  assert.equal(ownDetail.status, 200);

  const ownDetailBody = (await ownDetail.json()) as {
    funeralCase: { id: string };
    history: Array<{ newStatus: string }>;
  };

  assert.equal(ownDetailBody.funeralCase.id, ownCaseId);
  assert.equal(ownDetailBody.history.length, 1);

  const foreignDetail = await fetch(
    `${baseUrl}/api/employee/funeral-cases/${otherCaseId}`,
    { headers: headers(employeeSession.ip, employeeSession.cookie) },
  );

  assert.equal(foreignDetail.status, 404);
});

test("el empleado puede avanzar su expediente, pero no cancelarlo ni modificar uno ajeno", async () => {
  const otherEmployee = await createUser("empleado");
  const ownRequest = await createRequest();
  const otherRequest = await createRequest();
  await confirmRequest(ownRequest.id);
  await confirmRequest(otherRequest.id);

  const adminSession = await login(admin);

  const ownCreated = await createCase(
    ownRequest.id,
    adminSession,
    employee.id,
  );
  const otherCreated = await createCase(
    otherRequest.id,
    adminSession,
    otherEmployee.id,
  );

  assert.equal(ownCreated.status, 201);
  assert.equal(otherCreated.status, 201);

  const ownBody = (await ownCreated.json()) as {
    funeralCase: { id: string };
  };
  const otherBody = (await otherCreated.json()) as {
    funeralCase: { id: string };
  };

  const ownCaseId = ownBody.funeralCase.id;
  const otherCaseId = otherBody.funeralCase.id;
  cleanupCaseIds.push(ownCaseId, otherCaseId);

  const employeeSession = await login(employee);

  const updateOwn = await fetch(
    `${baseUrl}/api/employee/funeral-cases/${ownCaseId}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(employeeSession.ip, employeeSession.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "en_preparacion",
        observation: "  Preparación iniciada por el empleado.  ",
      }),
    },
  );

  assert.equal(updateOwn.status, 200);

  const updatedBody = (await updateOwn.json()) as {
    funeralCase: { status: string };
    history: Array<{
      newStatus: string;
      changedByUserId: string;
      observation: string | null;
    }>;
  };

  assert.equal(updatedBody.funeralCase.status, "en_preparacion");

  const change = updatedBody.history.find(
    (entry) => entry.newStatus === "en_preparacion",
  );

  assert.ok(change);
  assert.equal(change.changedByUserId, employee.id);
  assert.equal(change.observation, "Preparación iniciada por el empleado.");

  const cancelAttempt = await fetch(
    `${baseUrl}/api/employee/funeral-cases/${ownCaseId}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(employeeSession.ip, employeeSession.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelado" }),
    },
  );

  assert.equal(cancelAttempt.status, 409);

  const foreignUpdate = await fetch(
    `${baseUrl}/api/employee/funeral-cases/${otherCaseId}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers(employeeSession.ip, employeeSession.cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "en_preparacion" }),
    },
  );

  assert.equal(foreignUpdate.status, 404);

  const [storedOwn] = await db
    .select({ status: funeralCasesTable.status })
    .from(funeralCasesTable)
    .where(eq(funeralCasesTable.id, ownCaseId));

  const [storedOther] = await db
    .select({ status: funeralCasesTable.status })
    .from(funeralCasesTable)
    .where(eq(funeralCasesTable.id, otherCaseId));

  assert.equal(storedOwn.status, "en_preparacion");
  assert.equal(storedOther.status, "abierto");

  const ownHistory = await db
    .select()
    .from(funeralCaseStatusHistoryTable)
    .where(eq(funeralCaseStatusHistoryTable.funeralCaseId, ownCaseId));

  assert.equal(ownHistory.length, 2);
});

test("las rutas del empleado rechazan administradores y solicitudes sin sesión", async () => {
  const unauthenticated = await fetch(
    `${baseUrl}/api/employee/funeral-cases`,
  );
  assert.equal(unauthenticated.status, 401);

  const adminSession = await login(admin);
  const forbidden = await fetch(
    `${baseUrl}/api/employee/funeral-cases`,
    { headers: headers(adminSession.ip, adminSession.cookie) },
  );

  assert.equal(forbidden.status, 403);
});

test("la actualización del empleado exige un origen válido", async () => {
  const request = await createRequest();
  await confirmRequest(request.id);

  const adminSession = await login(admin);
  const created = await createCase(request.id, adminSession, employee.id);

  assert.equal(created.status, 201);

  const body = (await created.json()) as {
    funeralCase: { id: string };
  };

  const caseId = body.funeralCase.id;
  cleanupCaseIds.push(caseId);

  const employeeSession = await login(employee);

  const response = await fetch(
    `${baseUrl}/api/employee/funeral-cases/${caseId}/status`,
    {
      method: "PATCH",
      headers: {
        "X-Forwarded-For": employeeSession.ip,
        Origin: "https://sitio-ajeno.example",
        Cookie: employeeSession.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "en_preparacion" }),
    },
  );

  assert.equal(response.status, 403);
});
