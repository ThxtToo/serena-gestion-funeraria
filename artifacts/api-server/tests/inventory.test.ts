import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  inventoryItemsTable,
  inventoryMovementsTable,
  rolesTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import { hashPassword } from "../src/lib/auth-security.ts";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

let admin: { id: string; cookie: string };
let employee: { cookie: string };

const cleanupUserIds: string[] = [];
const cleanupItemIds: string[] = [];

let ipSequence = 200;

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

async function createUser(
  roleId: "administrador" | "empleado",
): Promise<{ id: string; cookie: string }> {
  const email = `serena-inventory-${randomUUID()}@example.com`;
  const password = "Fixture-Test-Passphrase-2026";

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName: `Usuario de inventario ${roleId}`,
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
    id: user.id,
    cookie: (response.headers.get("set-cookie") ?? "").split(";", 1)[0],
  };
}

async function createItem(
  cookie: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; quantity: number; lowStock: boolean }> {
  const response = await fetch(`${baseUrl}/api/admin/inventory-items`, {
    method: "POST",
    headers: { ...headers(cookie), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Artículo ${randomBytes(4).toString("hex")}`,
      category: "Cofres",
      unit: "unidad",
      minimumQuantity: 2,
      initialQuantity: 5,
      ...overrides,
    }),
  });

  assert.equal(response.status, 201);

  const body = (await response.json()) as {
    inventoryItem: { id: string; quantity: number; lowStock: boolean };
  };

  cleanupItemIds.push(body.inventoryItem.id);

  return body.inventoryItem;
}

async function move(
  cookie: string,
  itemId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}/api/admin/inventory-items/${itemId}/movements`, {
    method: "POST",
    headers: { ...headers(cookie), "Content-Type": "application/json" },
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
  if (cleanupItemIds.length > 0) {
    await db
      .delete(inventoryMovementsTable)
      .where(inArray(inventoryMovementsTable.inventoryItemId, cleanupItemIds));
    await db
      .delete(inventoryItemsTable)
      .where(inArray(inventoryItemsTable.id, cleanupItemIds));
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

test("crear un artículo registra la existencia inicial como movimiento", async () => {
  const item = await createItem(admin.cookie, { initialQuantity: 7 });

  assert.equal(item.quantity, 7);
  assert.equal(item.lowStock, false);

  const movements = await db
    .select()
    .from(inventoryMovementsTable)
    .where(eq(inventoryMovementsTable.inventoryItemId, item.id));

  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, "entrada");
  assert.equal(movements[0].previousQuantity, 0);
  assert.equal(movements[0].newQuantity, 7);
});

test("no se permiten dos artículos con el mismo nombre", async () => {
  const name = `Cofre ${randomBytes(3).toString("hex")}`;
  await createItem(admin.cookie, { name });

  const response = await fetch(`${baseUrl}/api/admin/inventory-items`, {
    method: "POST",
    headers: { ...headers(admin.cookie), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `  ${name.toUpperCase()}  `,
      category: "Cofres",
      unit: "unidad",
    }),
  });

  assert.equal(response.status, 409);
});

test("una salida mayor a la existencia se rechaza y no altera el artículo", async () => {
  const item = await createItem(admin.cookie, { initialQuantity: 3 });

  const response = await move(admin.cookie, item.id, {
    type: "salida",
    quantity: 4,
  });

  assert.equal(response.status, 400);

  const [stored] = await db
    .select({ quantity: inventoryItemsTable.quantity })
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.id, item.id));

  assert.equal(stored.quantity, 3);
});

test("una salida válida descuenta existencias y conserva la trazabilidad", async () => {
  const item = await createItem(admin.cookie, { initialQuantity: 5 });

  const response = await move(employee.cookie, item.id, {
    type: "salida",
    quantity: 2,
    reason: "Uso en servicio de la familia Bermúdez.",
  });

  assert.equal(response.status, 201);

  const body = (await response.json()) as {
    inventoryItem: { quantity: number };
    movement: { previousQuantity: number; newQuantity: number };
  };

  assert.equal(body.inventoryItem.quantity, 3);
  assert.equal(body.movement.previousQuantity, 5);
  assert.equal(body.movement.newQuantity, 3);
});

test("el ajuste requiere administración y motivo", async () => {
  const item = await createItem(admin.cookie, { initialQuantity: 5 });

  const asEmployee = await move(employee.cookie, item.id, {
    type: "ajuste",
    quantity: 2,
  });
  assert.equal(asEmployee.status, 403);

  const withoutReason = await move(admin.cookie, item.id, {
    type: "ajuste",
    quantity: 2,
  });
  assert.equal(withoutReason.status, 400);

  const withReason = await move(admin.cookie, item.id, {
    type: "ajuste",
    quantity: 1,
    reason: "Conteo físico de fin de mes.",
  });
  assert.equal(withReason.status, 201);

  const body = (await withReason.json()) as {
    inventoryItem: { quantity: number; lowStock: boolean };
    movement: { quantity: number; previousQuantity: number; newQuantity: number };
  };

  assert.equal(body.inventoryItem.quantity, 1);
  assert.equal(body.inventoryItem.lowStock, true);
  assert.equal(body.movement.quantity, 1);
  assert.equal(body.movement.newQuantity, 1);
});

test("dos salidas simultáneas no dejan existencias negativas", async () => {
  const item = await createItem(admin.cookie, { initialQuantity: 5 });

  const responses = await Promise.all([
    move(employee.cookie, item.id, { type: "salida", quantity: 4 }),
    move(employee.cookie, item.id, { type: "salida", quantity: 4 }),
  ]);

  const statuses = responses.map((response) => response.status).sort();

  assert.deepEqual(statuses, [201, 400]);

  const [stored] = await db
    .select({ quantity: inventoryItemsTable.quantity })
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.id, item.id));

  assert.equal(stored.quantity, 1);
});

test("el historial de movimientos se ordena del más reciente al más antiguo", async () => {
  const item = await createItem(admin.cookie, { initialQuantity: 5 });

  await move(admin.cookie, item.id, { type: "salida", quantity: 1 });
  await move(admin.cookie, item.id, { type: "entrada", quantity: 2 });

  const response = await fetch(
    `${baseUrl}/api/admin/inventory-items/${item.id}/movements`,
    { headers: headers(admin.cookie) },
  );

  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    movements: Array<{ type: string }>;
  };

  assert.equal(body.movements.length, 3);
  assert.equal(body.movements[0].type, "entrada");
  assert.equal(body.movements[2].type, "entrada");
});

test("un artículo inexistente responde 404", async () => {
  const response = await move(admin.cookie, randomUUID(), {
    type: "entrada",
    quantity: 1,
  });

  assert.equal(response.status, 404);
});
