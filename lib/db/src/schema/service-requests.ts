import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./auth";
import { serviceOfferingsTable } from "./service-offerings";

export const serviceRequestStatus = pgEnum("service_request_status", [
  "pendiente",
  "en_revision",
  "confirmada",
  "rechazada",
  "cancelada",
]);

export const serviceRequestsTable = pgTable("service_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceCode: text("reference_code").notNull().unique(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  serviceType: text("service_type").notNull(),
  serviceOfferingId: uuid("service_offering_id").references(
    () => serviceOfferingsTable.id,
    { onDelete: "restrict" },
  ),
  requestedDate: timestamp("requested_date", { withTimezone: true }),
  notes: text("notes"),
  status: serviceRequestStatus("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertServiceRequestSchema = createInsertSchema(
  serviceRequestsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ServiceRequest = typeof serviceRequestsTable.$inferSelect;

/**
 * Historial de cambios de estado de una solicitud.
 *
 * Los registros no se modifican ni se eliminan desde la aplicación: solo se
 * insertan, y siempre dentro de la misma transacción que actualiza
 * `service_requests.status`.
 */
export const serviceRequestStatusHistoryTable = pgTable(
  "service_request_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceRequestId: uuid("service_request_id")
      .notNull()
      .references(() => serviceRequestsTable.id, { onDelete: "cascade" }),
    previousStatus: serviceRequestStatus("previous_status"),
    newStatus: serviceRequestStatus("new_status").notNull(),
    changedByUserId: uuid("changed_by_user_id").references(
      () => usersTable.id,
      { onDelete: "restrict" },
    ),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("service_request_status_history_request_idx").on(
      table.serviceRequestId,
      table.createdAt,
    ),
  ],
);

export type ServiceRequestStatusHistoryEntry =
  typeof serviceRequestStatusHistoryTable.$inferSelect;

