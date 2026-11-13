import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Pólizas ficticias para la demostración académica (CU-08).
 *
 * No representan una integración con aseguradoras reales y siempre se
 * identifican como datos de demostración.
 */
export const demoPolicyStatus = pgEnum("demo_policy_status", [
  "vigente",
  "vencida",
  "suspendida",
]);

export const insurersTable = pgTable("insurers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  isDemoData: boolean("is_demo_data").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const demoPoliciesTable = pgTable(
  "demo_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    policyCode: text("policy_code").notNull().unique(),
    insurerId: uuid("insurer_id")
      .notNull()
      .references(() => insurersTable.id, { onDelete: "restrict" }),
    demoStatus: demoPolicyStatus("demo_status").notNull().default("vigente"),
    isDemoData: boolean("is_demo_data").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("demo_policies_insurer_idx").on(table.insurerId)],
);

export type Insurer = typeof insurersTable.$inferSelect;
export type DemoPolicy = typeof demoPoliciesTable.$inferSelect;
