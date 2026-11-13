import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Canales reales de atención humana configurados por la funeraria.
 * El agente los usa para no inventar teléfonos ni correos.
 */
export const contactChannelType = pgEnum("contact_channel_type", [
  "telefono",
  "correo",
  "whatsapp",
  "otro",
]);

export const contactChannelsTable = pgTable(
  "contact_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: contactChannelType("type").notNull(),
    value: text("value").notNull(),
    label: text("label"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contact_channels_is_active_idx").on(table.isActive)],
);
