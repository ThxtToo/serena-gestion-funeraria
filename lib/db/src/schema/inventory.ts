import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

/**
 * Inventario controlado por cantidades y unidades (DT-017): sin lotes ni
 * números de serie en esta versión.
 *
 * `quantity` solo cambia a través de un movimiento registrado en la misma
 * transacción (DT-023).
 */
export const inventoryMovementType = pgEnum("inventory_movement_type", [
  "entrada",
  "salida",
  "ajuste",
]);

export const inventoryItemsTable = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull().default(0),
    unit: text("unit").notNull(),
    minimumQuantity: integer("minimum_quantity").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("inventory_items_quantity_check", sql`${table.quantity} >= 0`),
    check(
      "inventory_items_minimum_quantity_check",
      sql`${table.minimumQuantity} >= 0`,
    ),
    uniqueIndex("inventory_items_name_normalized_uidx").on(
      sql`lower(trim(${table.name}))`,
    ),
    index("inventory_items_is_active_idx").on(table.isActive),
  ],
);

export const inventoryMovementsTable = pgTable(
  "inventory_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItemsTable.id, { onDelete: "restrict" }),
    type: inventoryMovementType("type").notNull(),
    quantity: integer("quantity").notNull(),
    previousQuantity: integer("previous_quantity").notNull(),
    newQuantity: integer("new_quantity").notNull(),
    reason: text("reason"),
    performedByUserId: uuid("performed_by_user_id").references(
      () => usersTable.id,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inventory_movements_item_created_idx").on(
      table.inventoryItemId,
      table.createdAt,
    ),
    check("inventory_movements_new_quantity_check", sql`${table.newQuantity} >= 0`),
  ],
);

export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
