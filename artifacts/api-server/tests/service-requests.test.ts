import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import {
  db,
  serviceOfferingsTable,
  serviceRequestsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import app from "../src/app.ts";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

before(async () => {
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
});

test("POST /api/service-requests rechaza un cuerpo vacío", async () => {
  const response = await fetch(`${baseUrl}/api/service-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Los datos de la solicitud no son válidos.",
  });
});

test("GET /api/service-requests rechaza una referencia inválida", async () => {
  const response = await fetch(
    `${baseUrl}/api/service-requests/REFERENCIA-INVALIDA`,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "El código de referencia no es válido.",
  });
});

test("GET /api/service-requests devuelve 404 si la referencia no existe", async () => {
  const referenceCode = `SER-${randomBytes(5).toString("hex").toUpperCase()}`;

  const response = await fetch(
    `${baseUrl}/api/service-requests/${referenceCode}`,
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "No se encontró una solicitud con ese código de referencia.",
  });
});

test("POST crea una solicitud con una oferta activa y GET permite consultarla", async () => {
  let referenceCode: string | undefined;
  let offeringId: string | undefined;

  try {
    const offeringName = `Servicio de prueba ${randomBytes(4).toString("hex")}`;

    const [offering] = await db
      .insert(serviceOfferingsTable)
      .values({
        name: offeringName,
        description: "Oferta temporal para pruebas automatizadas",
        isActive: true,
      })
      .returning({ id: serviceOfferingsTable.id });

    offeringId = offering.id;

    const createResponse = await fetch(`${baseUrl}/api/service-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName: "Prueba Automatizada",
        contactPhone: "04121234567",
        serviceOfferingId: offering.id,
        notes: "Registro temporal para prueba automatizada",
      }),
    });

    assert.equal(createResponse.status, 201);

    const created = await createResponse.json();

    assert.match(created.referenceCode, /^SER-[A-F0-9]{10}$/);
    assert.equal(created.status, "pendiente");
    referenceCode = created.referenceCode;

    const [storedRequest] = await db
      .select({
        serviceType: serviceRequestsTable.serviceType,
        serviceOfferingId: serviceRequestsTable.serviceOfferingId,
      })
      .from(serviceRequestsTable)
      .where(eq(serviceRequestsTable.referenceCode, referenceCode))
      .limit(1);

    assert.equal(storedRequest.serviceOfferingId, offering.id);
    assert.equal(storedRequest.serviceType, offeringName);

    const getResponse = await fetch(
      `${baseUrl}/api/service-requests/${referenceCode}`,
    );

    assert.equal(getResponse.status, 200);

    const found = await getResponse.json();

    assert.equal(found.referenceCode, referenceCode);
    assert.equal(found.status, "pendiente");
  } finally {
    if (referenceCode) {
      await db
        .delete(serviceRequestsTable)
        .where(eq(serviceRequestsTable.referenceCode, referenceCode));
    }

    if (offeringId) {
      await db
        .delete(serviceOfferingsTable)
        .where(eq(serviceOfferingsTable.id, offeringId));
    }
  }
});

test("POST rechaza una oferta inactiva", async () => {
  const [offering] = await db
    .insert(serviceOfferingsTable)
    .values({
      name: `Oferta inactiva ${randomBytes(4).toString("hex")}`,
      isActive: false,
    })
    .returning({ id: serviceOfferingsTable.id });

  try {
    const response = await fetch(`${baseUrl}/api/service-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName: "Prueba Automatizada",
        contactPhone: "04121234567",
        serviceOfferingId: offering.id,
      }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "El servicio seleccionado no está disponible.",
    });
  } finally {
    await db
      .delete(serviceOfferingsTable)
      .where(eq(serviceOfferingsTable.id, offering.id));
  }
});
