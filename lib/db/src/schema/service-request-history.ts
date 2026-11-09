import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { serviceRequestsTable, serviceRequestStatus } from "./service-requests";
import { usersTable } from "./auth";

export const serviceRequestStatusHistoryTable = pgTable(
  "service_request_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceRequestId: uuid("service_request_id")
      .notNull()
      .references(() => serviceRequestsTable.id, { onDelete: "restrict" }),
    previousStatus: serviceRequestStatus("previous_status"),
    newStatus: serviceRequestStatus("new_status").notNull(),
    changedByUserId: uuid("changed_by_user_id")
      .references(() => usersTable.id, { onDelete: "restrict" }),
    observation: text("observation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("service_request_status_history_request_idx")
      .on(table.serviceRequestId, table.createdAt),
    index("service_request_status_history_user_idx")
      .on(table.changedByUserId),
  ],
);

export type ServiceRequestStatusHistory =
  typeof serviceRequestStatusHistoryTable.$inferSelect;
