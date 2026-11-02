import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const serviceOfferingsTable = pgTable(
  "service_offerings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("service_offerings_is_active_idx").on(table.isActive),
    uniqueIndex("service_offerings_name_normalized_uidx").on(
      sql`lower(trim(${table.name}))`,
    ),
  ],
);

export const insertServiceOfferingSchema = createInsertSchema(
  serviceOfferingsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ServiceOffering = typeof serviceOfferingsTable.$inferSelect;
