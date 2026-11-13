import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  ApiError,
  CreateInventoryItemBody,
  CreateInventoryItemResponse,
  CreateInventoryMovementBody,
  CreateInventoryMovementParams,
  CreateInventoryMovementResponse,
  ListInventoryItemsResponse,
  ListInventoryMovementsParams,
  ListInventoryMovementsResponse,
  UpdateInventoryItemBody,
  UpdateInventoryItemParams,
  UpdateInventoryItemResponse,
} from "@workspace/api-zod";
import {
  db,
  inventoryItemsTable,
  inventoryMovementsTable,
} from "@workspace/db";
import { requireAdministrator, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const itemColumns = {
  id: inventoryItemsTable.id,
  name: inventoryItemsTable.name,
  category: inventoryItemsTable.category,
  description: inventoryItemsTable.description,
  quantity: inventoryItemsTable.quantity,
  unit: inventoryItemsTable.unit,
  minimumQuantity: inventoryItemsTable.minimumQuantity,
  isActive: inventoryItemsTable.isActive,
  createdAt: inventoryItemsTable.createdAt,
  updatedAt: inventoryItemsTable.updatedAt,
};

type ItemRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  quantity: number;
  unit: string;
  minimumQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toResponseItem(row: ItemRow) {
  return { ...row, lowStock: row.quantity <= row.minimumQuantity };
}

const movementColumns = {
  id: inventoryMovementsTable.id,
  inventoryItemId: inventoryMovementsTable.inventoryItemId,
  type: inventoryMovementsTable.type,
  quantity: inventoryMovementsTable.quantity,
  previousQuantity: inventoryMovementsTable.previousQuantity,
  newQuantity: inventoryMovementsTable.newQuantity,
  reason: inventoryMovementsTable.reason,
  performedByUserId: inventoryMovementsTable.performedByUserId,
  createdAt: inventoryMovementsTable.createdAt,
};

router.get("/admin/inventory-items", requireAuth(), async (req, res) => {
  try {
    const rows = await db
      .select(itemColumns)
      .from(inventoryItemsTable)
      .orderBy(desc(inventoryItemsTable.isActive), inventoryItemsTable.name);

    const response = ListInventoryItemsResponse.parse({
      items: rows.map(toResponseItem),
    });

    res.status(200).json(response);
  } catch (error) {
    req.log?.error({ err: error }, "Error al listar inventario");

    const response: ApiError = {
      error: "No fue posible obtener el inventario.",
    };
    res.status(500).json(response);
  }
});

router.post(
  "/admin/inventory-items",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = CreateInventoryItemBody.safeParse(req.body);

    if (!parsed.success) {
      const error: ApiError = {
        error: "Los datos del artículo no son válidos.",
      };
      res.status(400).json(error);
      return;
    }

    const data = parsed.data;
    const initialQuantity = data.initialQuantity ?? 0;

    try {
      const outcome = await db.transaction(async (tx) => {
        const [duplicate] = await tx
          .select({ id: inventoryItemsTable.id })
          .from(inventoryItemsTable)
          .where(
            sql`lower(trim(${inventoryItemsTable.name})) = lower(trim(${data.name}))`,
          )
          .limit(1);

        if (duplicate) return { kind: "duplicate" as const };

        const [created] = await tx
          .insert(inventoryItemsTable)
          .values({
            name: data.name.trim(),
            category: data.category.trim(),
            description: data.description?.trim() || null,
            unit: data.unit.trim(),
            minimumQuantity: data.minimumQuantity ?? 0,
            quantity: initialQuantity,
            isActive: true,
          })
          .returning(itemColumns);

        if (initialQuantity > 0) {
          await tx.insert(inventoryMovementsTable).values({
            inventoryItemId: created.id,
            type: "entrada",
            quantity: initialQuantity,
            previousQuantity: 0,
            newQuantity: initialQuantity,
            reason: "Existencia inicial registrada al crear el artículo.",
            performedByUserId: req.serenaAuth?.userId ?? null,
          });
        }

        return { kind: "created" as const, created };
      });

      if (outcome.kind === "duplicate") {
        const error: ApiError = {
          error: "Ya existe un artículo con ese nombre.",
        };
        res.status(409).json(error);
        return;
      }

      const response = CreateInventoryItemResponse.parse({
        inventoryItem: toResponseItem(outcome.created),
      });

      res.status(201).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al crear artículo de inventario");

      const response: ApiError = {
        error: "No fue posible crear el artículo.",
      };
      res.status(500).json(response);
    }
  },
);

router.patch(
  "/admin/inventory-items/:inventoryItemId",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const params = UpdateInventoryItemParams.safeParse(req.params);
    const body = UpdateInventoryItemBody.safeParse(req.body);

    if (!params.success || !body.success) {
      const error: ApiError = { error: "Los datos enviados no son válidos." };
      res.status(400).json(error);
      return;
    }

    const changes = body.data;

    if (Object.keys(changes).length === 0) {
      const error: ApiError = {
        error: "Indica al menos un campo para actualizar.",
      };
      res.status(400).json(error);
      return;
    }

    try {
      const [updated] = await db
        .update(inventoryItemsTable)
        .set({
          ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
          ...(changes.category !== undefined
            ? { category: changes.category.trim() }
            : {}),
          ...(changes.description !== undefined
            ? { description: changes.description?.trim() || null }
            : {}),
          ...(changes.unit !== undefined ? { unit: changes.unit.trim() } : {}),
          ...(changes.minimumQuantity !== undefined
            ? { minimumQuantity: changes.minimumQuantity }
            : {}),
          ...(changes.isActive !== undefined
            ? { isActive: changes.isActive }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItemsTable.id, params.data.inventoryItemId))
        .returning(itemColumns);

      if (!updated) {
        const error: ApiError = { error: "El artículo no existe." };
        res.status(404).json(error);
        return;
      }

      const response = UpdateInventoryItemResponse.parse({
        inventoryItem: toResponseItem(updated),
      });

      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al actualizar artículo");

      const response: ApiError = {
        error: "No fue posible actualizar el artículo.",
      };
      res.status(500).json(response);
    }
  },
);

router.get(
  "/admin/inventory-items/:inventoryItemId/movements",
  requireAuth(),
  async (req, res) => {
    const params = ListInventoryMovementsParams.safeParse(req.params);

    if (!params.success) {
      const error: ApiError = { error: "El identificador no es válido." };
      res.status(400).json(error);
      return;
    }

    try {
      const [item] = await db
        .select({ id: inventoryItemsTable.id })
        .from(inventoryItemsTable)
        .where(eq(inventoryItemsTable.id, params.data.inventoryItemId))
        .limit(1);

      if (!item) {
        const error: ApiError = { error: "El artículo no existe." };
        res.status(404).json(error);
        return;
      }

      const rows = await db
        .select(movementColumns)
        .from(inventoryMovementsTable)
        .where(eq(inventoryMovementsTable.inventoryItemId, item.id))
        .orderBy(desc(inventoryMovementsTable.createdAt));

      const response = ListInventoryMovementsResponse.parse({
        movements: rows,
      });

      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al listar movimientos");

      const response: ApiError = {
        error: "No fue posible obtener los movimientos.",
      };
      res.status(500).json(response);
    }
  },
);

router.post(
  "/admin/inventory-items/:inventoryItemId/movements",
  requireAuth(),
  async (req, res) => {
    const params = CreateInventoryMovementParams.safeParse(req.params);
    const body = CreateInventoryMovementBody.safeParse(req.body);

    if (!params.success || !body.success) {
      const error: ApiError = {
        error: "Los datos del movimiento no son válidos.",
      };
      res.status(400).json(error);
      return;
    }

    const { type, quantity } = body.data;
    const reason = body.data.reason?.trim() || null;
    const actor = req.serenaAuth;

    if (type === "ajuste" && actor?.role !== "administrador") {
      const error: ApiError = {
        error: "Solo la administración puede registrar ajustes de inventario.",
      };
      res.status(403).json(error);
      return;
    }

    if (type === "ajuste" && !reason) {
      const error: ApiError = {
        error: "Todo ajuste requiere un motivo justificado.",
      };
      res.status(400).json(error);
      return;
    }

    if (type !== "ajuste" && quantity < 1) {
      const error: ApiError = {
        error: "La cantidad debe ser mayor que cero.",
      };
      res.status(400).json(error);
      return;
    }

    try {
      const outcome = await db.transaction(async (tx) => {
        const [current] = await tx
          .select({ id: inventoryItemsTable.id, quantity: inventoryItemsTable.quantity })
          .from(inventoryItemsTable)
          .where(eq(inventoryItemsTable.id, params.data.inventoryItemId))
          .limit(1)
          .for("update");

        if (!current) return { kind: "not-found" as const };

        const previousQuantity = current.quantity;
        let newQuantity: number;

        if (type === "entrada") {
          newQuantity = previousQuantity + quantity;
        } else if (type === "salida") {
          if (quantity > previousQuantity) {
            return { kind: "insufficient" as const, available: previousQuantity };
          }
          newQuantity = previousQuantity - quantity;
        } else {
          newQuantity = quantity;
        }

        const [updated] = await tx
          .update(inventoryItemsTable)
          .set({ quantity: newQuantity, updatedAt: new Date() })
          .where(eq(inventoryItemsTable.id, current.id))
          .returning(itemColumns);

        const [movement] = await tx
          .insert(inventoryMovementsTable)
          .values({
            inventoryItemId: current.id,
            type,
            quantity,
            previousQuantity,
            newQuantity,
            reason,
            performedByUserId: actor?.userId ?? null,
          })
          .returning(movementColumns);

        return {
          kind: "ok" as const,
          updated,
          movement: { ...movement, performedByName: actor?.fullName ?? null },
        };
      });

      if (outcome.kind === "not-found") {
        const error: ApiError = { error: "El artículo no existe." };
        res.status(404).json(error);
        return;
      }

      if (outcome.kind === "insufficient") {
        const error: ApiError = {
          error: `No hay existencias suficientes. Disponible: ${outcome.available}.`,
        };
        res.status(400).json(error);
        return;
      }

      const response = CreateInventoryMovementResponse.parse({
        inventoryItem: toResponseItem(outcome.updated),
        movement: outcome.movement,
      });

      res.status(201).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al registrar movimiento");

      const response: ApiError = {
        error: "No fue posible registrar el movimiento.",
      };
      res.status(500).json(response);
    }
  },
);

export default router;
