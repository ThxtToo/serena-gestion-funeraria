import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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
