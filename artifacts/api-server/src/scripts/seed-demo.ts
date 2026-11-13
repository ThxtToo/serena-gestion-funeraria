import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  demoPoliciesTable,
  insurersTable,
  pool,
  rolesTable,
  serviceOfferingsTable,
  serviceRequestStatusHistoryTable,
  serviceRequestsTable,
  usersTable,
} from "@workspace/db";
import { hashPassword } from "../lib/auth-security";

/**
 * Datos ficticios para demostración y pruebas manuales.
 *
 * - Es idempotente: se puede ejecutar varias veces sin duplicar registros.
 * - Nunca debe ejecutarse contra una base de datos real. Se bloquea cuando
 *   NODE_ENV es "production" salvo que se pida explícitamente.
 */

const ADMIN_EMAIL = "admin@serena.demo";
const STAFF_EMAIL = "equipo@serena.demo";
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? "SerenaDemo2026!";

function referenceCode(): string {
  return `SER-${randomBytes(5).toString("hex").toUpperCase()}`;
}

async function ensureUser(
  email: string,
  fullName: string,
  roleId: "administrador" | "empleado",
): Promise<string | null> {
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) return null;

  const [created] = await db
    .insert(usersTable)
    .values({
      fullName,
      email,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      roleId,
      isActive: true,
      mustChangePassword: false,
    })
    .returning({ id: usersTable.id });

  return created.id;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
    throw new Error(
      "Los datos de demostración no se cargan en producción. Usa ALLOW_DEMO_SEED=1 solo en un entorno de prueba.",
    );
  }

  await db
    .insert(rolesTable)
    .values([
      { id: "administrador", description: "Administra Serena." },
      { id: "empleado", description: "Personal de Serena." },
    ])
    .onConflictDoNothing();

  const adminId = await ensureUser(
    ADMIN_EMAIL,
    "Administración Serena",
    "administrador",
  );

  await ensureUser(STAFF_EMAIL, "Equipo de atención", "empleado");

  const offerings = [
    {
      name: "Servicio de velación",
      description:
        "Preparación de la persona fallecida, velación en sala y acompañamiento a la familia.",
    },
    {
      name: "Traslado y preparación",
      description:
        "Traslado desde el lugar del deceso y preparación inicial del servicio.",
    },
    {
      name: "Sala de velación",
      description: "Disponibilidad de sala, mobiliario y atención durante la velación.",
    },
    {
      name: "Plan de acompañamiento",
      description:
        "Orientación administrativa y acompañamiento a la familia durante el proceso.",
    },
  ];

  const savedOfferings: Array<{ id: string; name: string }> = [];

  for (const offering of offerings) {
    const [existing] = await db
      .select({ id: serviceOfferingsTable.id, name: serviceOfferingsTable.name })
      .from(serviceOfferingsTable)
      .where(eq(serviceOfferingsTable.name, offering.name))
      .limit(1);

    if (existing) {
      savedOfferings.push(existing);
      continue;
    }

    const [created] = await db
      .insert(serviceOfferingsTable)
      .values({
        name: offering.name,
        description: offering.description,
        isActive: true,
      })
      .returning({ id: serviceOfferingsTable.id, name: serviceOfferingsTable.name });

    savedOfferings.push(created);
  }

  const [existingInsurer] = await db
    .select({ id: insurersTable.id })
    .from(insurersTable)
    .limit(1);

  if (!existingInsurer) {
    const [insurerA] = await db
      .insert(insurersTable)
      .values({ name: "Aseguradora Demo Norte", isDemoData: true })
      .returning({ id: insurersTable.id });

    const [insurerB] = await db
      .insert(insurersTable)
      .values({ name: "Aseguradora Demo Sur", isDemoData: true })
      .returning({ id: insurersTable.id });

    await db.insert(demoPoliciesTable).values([
      { policyCode: "DEMO-0001", insurerId: insurerA.id, demoStatus: "vigente" },
      { policyCode: "DEMO-0002", insurerId: insurerA.id, demoStatus: "vencida" },
      { policyCode: "DEMO-0003", insurerId: insurerB.id, demoStatus: "vigente" },
    ]);
  }

  const [existingRequest] = await db
    .select({ id: serviceRequestsTable.id })
    .from(serviceRequestsTable)
    .limit(1);

  if (existingRequest) {
    console.log("Ya existen solicitudes; no se crean nuevas.");
  } else {
    const pendiente = savedOfferings[0];
    const enRevision = savedOfferings[1];
    const confirmada = savedOfferings[2];

    const [pendingRequest] = await db
      .insert(serviceRequestsTable)
      .values({
        referenceCode: referenceCode(),
        contactName: "María Fernanda Ríos",
        contactPhone: "04141234567",
        serviceType: pendiente.name,
        serviceOfferingId: pendiente.id,
        requestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        notes: "Solicitud de demostración pendiente de revisión.",
        status: "pendiente",
      })
      .returning({ id: serviceRequestsTable.id });

    await db.insert(serviceRequestStatusHistoryTable).values({
      serviceRequestId: pendingRequest.id,
      previousStatus: null,
      newStatus: "pendiente",
      changedByUserId: null,
    });

    const [reviewRequest] = await db
      .insert(serviceRequestsTable)
      .values({
        referenceCode: referenceCode(),
        contactName: "José Gregorio Salas",
        contactPhone: "04241234567",
        serviceType: enRevision.name,
        serviceOfferingId: enRevision.id,
        requestedDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: "Solicitud de demostración en revisión.",
        status: "en_revision",
      })
      .returning({ id: serviceRequestsTable.id });

    await db.insert(serviceRequestStatusHistoryTable).values([
      {
        serviceRequestId: reviewRequest.id,
        previousStatus: null,
        newStatus: "pendiente",
        changedByUserId: null,
      },
      {
        serviceRequestId: reviewRequest.id,
        previousStatus: "pendiente",
        newStatus: "en_revision",
        changedByUserId: adminId,
        reason: "Se verificaron los datos de contacto.",
      },
    ]);

    const [confirmedRequest] = await db
      .insert(serviceRequestsTable)
      .values({
        referenceCode: referenceCode(),
        contactName: "Ana Lucía Bermúdez",
        contactPhone: "04161234567",
        serviceType: confirmada.name,
        serviceOfferingId: confirmada.id,
        requestedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "confirmada",
      })
      .returning({ id: serviceRequestsTable.id });

    await db.insert(serviceRequestStatusHistoryTable).values([
      {
        serviceRequestId: confirmedRequest.id,
        previousStatus: null,
        newStatus: "pendiente",
        changedByUserId: null,
      },
      {
        serviceRequestId: confirmedRequest.id,
        previousStatus: "pendiente",
        newStatus: "en_revision",
        changedByUserId: adminId,
        reason: "Sala disponible para la fecha solicitada.",
      },
      {
        serviceRequestId: confirmedRequest.id,
        previousStatus: "en_revision",
        newStatus: "confirmada",
        changedByUserId: adminId,
        reason: "Servicio confirmado con la familia.",
      },
    ]);
  }

  console.log("Datos de demostración listos.");
  console.log(`Administración: ${ADMIN_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Personal:       ${STAFF_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("No se pudieron cargar los datos de demostración.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
