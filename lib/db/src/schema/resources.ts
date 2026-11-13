import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { serviceRequestsTable } from "./service-requests";

/**
 * Recursos operativos de la funeraria: salas, vehículos y equipos que se
 * asignan a una solicitud durante un período.
 *
 * Los tipos y estados son valores controlados; el modelo documentado deja su
 * validación final a la funeraria, así que se mantienen en un conjunto pequeño
 * y explícito.
 */
export const resourceType = pgEnum("resource_type", [
  "sala",
  "vehiculo",
  "equipo",
  "otro",
]);

export const resourceStatus = pgEnum("resource_status", [
  "disponible",
  "mantenimiento",
  "fuera_de_servicio",
]);

export const resourceAssignmentStatus = pgEnum("resource_assignment_status", [
  "activa",
  "finalizada",
  "cancelada",
]);

export const resourcesTable = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: resourceType("type").notNull(),
    description: text("description"),
    status: resourceStatus("status").notNull().default("disponible"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("resources_status_idx").on(table.status),
    index("resources_type_idx").on(table.type),
  ],
);

export const resourceAssignmentsTable = pgTable(
  "resource_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceRequestId: uuid("service_request_id")
      .notNull()
      .references(() => serviceRequestsTable.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resourcesTable.id, { onDelete: "restrict" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: resourceAssignmentStatus("status").notNull().default("activa"),
    assignedByUserId: uuid("assigned_by_user_id").references(
      () => usersTable.id,
      { onDelete: "restrict" },
    ),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("resource_assignments_resource_period_idx").on(
      table.resourceId,
      table.startAt,
    ),
    index("resource_assignments_request_idx").on(table.serviceRequestId),
    check(
      "resource_assignments_period_check",
      sql`${table.startAt} < ${table.endAt}`,
    ),
  ],
);

export type Resource = typeof resourcesTable.$inferSelect;
export type ResourceAssignment = typeof resourceAssignmentsTable.$inferSelect;
