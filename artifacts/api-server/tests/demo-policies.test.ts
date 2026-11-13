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
  sessionsTable,
  usersTable,
} from "@workspace/db";
import { hashPassword } from "../src/lib/auth-security.ts";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

let cookie = "";
const cleanupUserIds: string[] = [];
const cleanupPolicyIds: string[] = [];
const cleanupInsurerIds: string[] = [];

let ipSequence = 320;

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

  const email = `serena-policy-${randomUUID()}@example.com`;
  const password = "Fixture-Test-Passphrase-2026";

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName: "Usuario de pólizas",
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
  if (cleanupPolicyIds.length > 0) {
    await db
      .delete(demoPoliciesTable)
      .where(inArray(demoPoliciesTable.id, cleanupPolicyIds));
  }

  if (cleanupInsurerIds.length > 0) {
    await db
      .delete(insurersTable)
      .where(inArray(insurersTable.id, cleanupInsurerIds));
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

async function createPolicy(policyCode: string) {
  const [insurer] = await db
    .insert(insurersTable)
    .values({
      name: `Aseguradora ficticia ${randomBytes(3).toString("hex")}`,
      isDemoData: true,
    })
    .returning({ id: insurersTable.id });

  cleanupInsurerIds.push(insurer.id);

  const [policy] = await db
    .insert(demoPoliciesTable)
    .values({
      policyCode,
      insurerId: insurer.id,
      demoStatus: "vigente",
      isDemoData: true,
    })
    .returning({ id: demoPoliciesTable.id });

  cleanupPolicyIds.push(policy.id);

  return policy.id;
}

test("la consulta de pólizas exige sesión", async () => {
  const response = await fetch(`${baseUrl}/api/admin/demo-policies/DEMO-0001`);
  assert.equal(response.status, 401);
});

test("una póliza existente se devuelve marcada como demostración", async () => {
  const code = `DEMO-${randomBytes(3).toString("hex").toUpperCase()}`;
  await createPolicy(code);

  const response = await fetch(`${baseUrl}/api/admin/demo-policies/${code}`, {
    headers: headers(cookie),
  });

  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    policy: { policyCode: string; isDemoData: boolean; notice: string; insurerName: string };
  };

  assert.equal(body.policy.policyCode, code);
  assert.equal(body.policy.isDemoData, true);
  assert.match(body.policy.notice, /ficticia de demostración/i);
  assert.ok(body.policy.insurerName.length > 0);
});

test("una póliza inexistente responde 404 sin inventar datos", async () => {
  const response = await fetch(
    `${baseUrl}/api/admin/demo-policies/DEMO-NOEXISTE`,
    { headers: headers(cookie) },
  );

  assert.equal(response.status, 404);
});

test("un código demasiado corto se rechaza", async () => {
  const response = await fetch(`${baseUrl}/api/admin/demo-policies/AB`, {
    headers: headers(cookie),
  });

  assert.equal(response.status, 400);
});
