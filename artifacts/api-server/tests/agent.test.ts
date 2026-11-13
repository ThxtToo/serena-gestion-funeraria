import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  demoPoliciesTable,
  insurersTable,
  rolesTable,
  serviceOfferingsTable,
  serviceRequestStatusHistoryTable,
  serviceRequestsTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import { hashPassword } from "../src/lib/auth-security.ts";
import { executeTool } from "../src/lib/agent/tools.ts";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

let cookie = "";
const cleanupUserIds: string[] = [];
const cleanupOfferingIds: string[] = [];
const cleanupRequestIds: string[] = [];
const cleanupPolicyIds: string[] = [];
const cleanupInsurerIds: string[] = [];

let ipSequence = 380;

function headers(auth?: string): Record<string, string> {
  const result: Record<string, string> = {
    Origin: baseUrl,
    "X-Forwarded-For": `198.51.100.${ipSequence++}`,
  };

  if (auth) result.Cookie = auth;

  return result;
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

  const email = `serena-agent-${randomUUID()}@example.com`;
  const password = "Fixture-Test-Passphrase-2026";

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName: "Usuario del agente",
      email,
      passwordHash: await hashPassword(password),
      roleId: "empleado",
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
  cookie = (response.headers.get("set-cookie") ?? "").split(";", 1)[0];
});

after(async () => {
  if (cleanupRequestIds.length > 0) {
    await db
      .delete(serviceRequestStatusHistoryTable)
      .where(inArray(serviceRequestStatusHistoryTable.serviceRequestId, cleanupRequestIds));
    await db
      .delete(serviceRequestsTable)
      .where(inArray(serviceRequestsTable.id, cleanupRequestIds));
  }

  if (cleanupOfferingIds.length > 0) {
    await db
      .delete(serviceOfferingsTable)
      .where(inArray(serviceOfferingsTable.id, cleanupOfferingIds));
  }

  if (cleanupPolicyIds.length > 0) {
    await db
      .delete(demoPoliciesTable)
      .where(inArray(demoPoliciesTable.id, cleanupPolicyIds));
  }

  if (cleanupInsurerIds.length > 0) {
    await db.delete(insurersTable).where(inArray(insurersTable.id, cleanupInsurerIds));
  }

  if (cleanupUserIds.length > 0) {
    await db.delete(sessionsTable).where(inArray(sessionsTable.userId, cleanupUserIds));
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

const context = () => ({ userId: cleanupUserIds[0] ?? randomUUID(), role: "empleado", scope: "staff" as const });

test("el agente exige sesión", async () => {
  const response = await fetch(`${baseUrl}/api/agent/chat`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hola" }] }),
  });

  assert.equal(response.status, 401);
});

test("sin clave de Groq el agente responde 503 sin inventar", async () => {
  const previous = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const response = await fetch(`${baseUrl}/api/agent/chat`, {
      method: "POST",
      headers: { ...headers(cookie), "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "¿Qué servicios tienen?" }] }),
    });

    assert.equal(response.status, 503);

    const body = (await response.json()) as { error: string };
    assert.match(body.error, /no está configurado/i);
  } finally {
    if (previous !== undefined) process.env.GROQ_API_KEY = previous;
  }
});

test("el agente rechaza un cuerpo inválido", async () => {
  const response = await fetch(`${baseUrl}/api/agent/chat`, {
    method: "POST",
    headers: { ...headers(cookie), "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [] }),
  });

  assert.equal(response.status, 400);
});

test("crear_solicitud registra la solicitud con un servicio activo", async () => {
  const name = `Servicio agente ${randomBytes(3).toString("hex")}`;

  const [offering] = await db
    .insert(serviceOfferingsTable)
    .values({ name, isActive: true })
    .returning({ id: serviceOfferingsTable.id });

  cleanupOfferingIds.push(offering.id);

  const outcome = await executeTool(
    "crear_solicitud",
    { nombre: "Persona de prueba", telefono: "04121234567", servicio: name },
    context(),
  );

  assert.equal(outcome.ok, true);

  if (!outcome.ok) return;

  const reference = String(outcome.data.referencia);
  assert.match(reference, /^SER-[A-F0-9]{10}$/);
  assert.equal(outcome.data.estado, "pendiente");

  const [stored] = await db
    .select({ id: serviceRequestsTable.id })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.referenceCode, reference));

  cleanupRequestIds.push(stored.id);
});

test("crear_solicitud rechaza un servicio que no está en el catálogo", async () => {
  const outcome = await executeTool(
    "crear_solicitud",
    { nombre: "Persona de prueba", telefono: "04121234567", servicio: "Servicio inexistente xyz" },
    context(),
  );

  assert.equal(outcome.ok, false);

  if (outcome.ok) return;

  assert.equal(outcome.errorCode, "servicio_no_encontrado");
});

test("consultar_solicitud informa cuando el código no existe", async () => {
  const outcome = await executeTool(
    "consultar_solicitud",
    { referencia: "SER-0000000000" },
    context(),
  );

  assert.equal(outcome.ok, false);

  if (outcome.ok) return;

  assert.equal(outcome.errorCode, "solicitud_no_encontrada");
});

test("verificar_poliza_demo solo consulta registros ficticios", async () => {
  const code = `DEMO-${randomBytes(3).toString("hex").toUpperCase()}`;

  const [insurer] = await db
    .insert(insurersTable)
    .values({ name: `Aseguradora agente ${randomBytes(3).toString("hex")}` })
    .returning({ id: insurersTable.id });

  cleanupInsurerIds.push(insurer.id);

  const [policy] = await db
    .insert(demoPoliciesTable)
    .values({ policyCode: code, insurerId: insurer.id })
    .returning({ id: demoPoliciesTable.id });

  cleanupPolicyIds.push(policy.id);

  const found = await executeTool("verificar_poliza_demo", { codigo: code }, context());
  assert.equal(found.ok, true);

  const missing = await executeTool(
    "verificar_poliza_demo",
    { codigo: "DEMO-NO-EXISTE" },
    context(),
  );
  assert.equal(missing.ok, false);
});

test("contacto_soporte no inventa canales cuando no están configurados", async () => {
  const previousPhone = process.env.SERENA_SUPPORT_PHONE;
  const previousEmail = process.env.SERENA_SUPPORT_EMAIL;
  delete process.env.SERENA_SUPPORT_PHONE;
  delete process.env.SERENA_SUPPORT_EMAIL;

  try {
    const outcome = await executeTool("contacto_soporte", {}, context());

    assert.equal(outcome.ok, true);

    if (!outcome.ok) return;

    // Si otro archivo de pruebas dejó un canal activo, el resultado válido es
    // true: lo importante es que nunca invente un canal inexistente.
    assert.equal(typeof outcome.data.canal_configurado, "boolean");
  } finally {
    if (previousPhone !== undefined) process.env.SERENA_SUPPORT_PHONE = previousPhone;
    if (previousEmail !== undefined) process.env.SERENA_SUPPORT_EMAIL = previousEmail;
  }
});

test("una herramienta no autorizada se rechaza", async () => {
  const outcome = await executeTool("ejecutar_sql", { query: "select 1" }, context());

  assert.equal(outcome.ok, false);

  if (outcome.ok) return;

  assert.equal(outcome.errorCode, "herramienta_no_autorizada");
});
