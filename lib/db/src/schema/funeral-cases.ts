import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { serviceRequestsTable } from "./service-requests";
import { usersTable } from "./auth";

export const funeralCaseStatus = pgEnum("funeral_case_status", [
  "abierto",
  "en_preparacion",
  "programado",
  "en_ejecucion",
  "finalizado",
  "cancelado",
]);

export const funeralCasesTable = pgTable(
  "funeral_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    caseNumber: text("case_number").notNull(),

    serviceRequestId: uuid("service_request_id")
      .notNull()
      .references(() => serviceRequestsTable.id, {
        onDelete: "restrict",
      }),

    deceasedFullName: text("deceased_full_name").notNull(),
    deceasedDateOfDeath: timestamp("deceased_date_of_death", {
      withTimezone: true,
    }),

    serviceLocation: text("service_location"),

    responsibleContactName: text("responsible_contact_name").notNull(),
    responsibleContactPhone: text("responsible_contact_phone").notNull(),

    assignedEmployeeId: uuid("assigned_employee_id").references(
      () => usersTable.id,
      { onDelete: "restrict" },
    ),

    status: funeralCaseStatus("status").notNull().default("abierto"),

    notes: text("notes"),

    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("funeral_cases_case_number_uidx").on(table.caseNumber),
    uniqueIndex("funeral_cases_service_request_uidx").on(
      table.serviceRequestId,
    ),
    index("funeral_cases_status_idx").on(table.status),
    index("funeral_cases_assigned_employee_idx").on(
      table.assignedEmployeeId,
    ),
    index("funeral_cases_created_at_idx").on(table.createdAt),
  ],
);

export const funeralCaseStatusHistoryTable = pgTable(
  "funeral_case_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    funeralCaseId: uuid("funeral_case_id")
      .notNull()
      .references(() => funeralCasesTable.id, {
        onDelete: "restrict",
      }),

    previousStatus: funeralCaseStatus("previous_status"),
    newStatus: funeralCaseStatus("new_status").notNull(),

    changedByUserId: uuid("changed_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),

    observation: text("observation"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("funeral_case_history_case_idx").on(table.funeralCaseId),
    index("funeral_case_history_created_at_idx").on(table.createdAt),
  ],
);

export type FuneralCase = typeof funeralCasesTable.$inferSelect;
export type FuneralCaseStatus = (typeof funeralCaseStatus.enumValues)[number];
