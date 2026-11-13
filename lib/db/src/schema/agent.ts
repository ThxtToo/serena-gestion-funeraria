import {
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
 * Registro técnico de las herramientas que ejecuta el agente.
 *
 * No guarda la conversación ni los argumentos completos: solo lo necesario
 * para depuración y trazabilidad (3.18 del modelo de datos).
 */
export const agentToolStatus = pgEnum("agent_tool_status", ["ok", "error"]);

export const agentToolLogsTable = pgTable(
  "agent_tool_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    toolName: text("tool_name").notNull(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    serviceRequestId: uuid("service_request_id").references(
      () => serviceRequestsTable.id,
      { onDelete: "set null" },
    ),
    requestId: text("request_id"),
    status: agentToolStatus("status").notNull(),
    safeErrorCode: text("safe_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("agent_tool_logs_created_idx").on(table.createdAt)],
);
