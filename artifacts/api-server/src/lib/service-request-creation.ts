import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  serviceOfferingsTable,
  serviceRequestStatusHistoryTable,
  serviceRequestsTable,
} from "@workspace/db";

export interface CreateServiceRequestInput {
  contactName: string;
  contactPhone: string;
  serviceOfferingId: string;
  requestedDate?: Date;
  notes?: string;
}

export type CreateServiceRequestOutcome =
  | { ok: true; referenceCode: string; status: "pendiente" }
  | { ok: false; reason: "offering-unavailable" };

function generateReferenceCode(): string {
  return `SER-${randomBytes(5).toString("hex").toUpperCase()}`;
}

/**
 * Registra una solicitud y su primer estado en el historial dentro de la misma
 * transacción. La usan tanto el formulario público como el agente.
 */
export async function createServiceRequestRecord(
  input: CreateServiceRequestInput,
): Promise<CreateServiceRequestOutcome> {
  return db.transaction(async (tx) => {
    const [offering] = await tx
      .select()
      .from(serviceOfferingsTable)
      .where(eq(serviceOfferingsTable.id, input.serviceOfferingId))
      .limit(1)
      .for("share");

    if (!offering || !offering.isActive) {
      return { ok: false as const, reason: "offering-unavailable" as const };
    }

    const [created] = await tx
      .insert(serviceRequestsTable)
      .values({
        referenceCode: generateReferenceCode(),
        contactName: input.contactName.trim(),
        contactPhone: input.contactPhone.trim(),
        serviceOfferingId: offering.id,
        serviceType: offering.name,
        requestedDate: input.requestedDate ?? null,
        notes: input.notes?.trim() || null,
        status: "pendiente",
      })
      .returning({
        id: serviceRequestsTable.id,
        referenceCode: serviceRequestsTable.referenceCode,
        status: serviceRequestsTable.status,
      });

    await tx.insert(serviceRequestStatusHistoryTable).values({
      serviceRequestId: created.id,
      previousStatus: null,
      newStatus: "pendiente",
      changedByUserId: null,
    });

    return {
      ok: true as const,
      referenceCode: created.referenceCode,
      status: "pendiente" as const,
    };
  });
}
