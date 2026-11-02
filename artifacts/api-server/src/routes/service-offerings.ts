import { Router, type IRouter } from "express";
import {
  ApiError,
  CreateServiceOfferingBody,
  CreateServiceOfferingResponse,
  ListAdminServiceOfferingsResponse,
  ListPublicServiceOfferingsResponse,
  UpdateServiceOfferingBody,
  UpdateServiceOfferingParams,
  UpdateServiceOfferingResponse,
} from "@workspace/api-zod";
import { db, serviceOfferingsTable } from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  requireAdministrator,
  requireAuth,
  requireSameOrigin,
} from "../middlewares/auth";

const router: IRouter = Router();

function sendError(
  res: Parameters<Parameters<typeof router.get>[1]>[1],
  status: number,
  message: string,
) {
  const response: ApiError = { error: message };
  res.status(status).json(response);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function normalizeName(value: string): string {
  return value.trim();
}

function normalizeDescription(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function nameAlreadyExists(
  name: string,
  excludedId?: string,
): Promise<boolean> {
  const conditions = [
    sql`lower(trim(${serviceOfferingsTable.name})) = lower(trim(${name}))`,
  ];

  if (excludedId) {
    conditions.push(ne(serviceOfferingsTable.id, excludedId));
  }

  const [existing] = await db
    .select({ id: serviceOfferingsTable.id })
    .from(serviceOfferingsTable)
    .where(and(...conditions))
    .limit(1);

  return Boolean(existing);
}

// Catálogo público: solo ofertas activas.
router.get("/service-offerings", async (req, res) => {
  try {
    const serviceOfferings = await db
      .select()
      .from(serviceOfferingsTable)
      .where(eq(serviceOfferingsTable.isActive, true))
      .orderBy(serviceOfferingsTable.name);

    const response = ListPublicServiceOfferingsResponse.parse({
      serviceOfferings,
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(response);
  } catch (error) {
    req.log?.error({ err: error }, "Error al consultar catálogo público");

    sendError(res, 500, "No fue posible consultar los servicios disponibles.");
  }
});

// Catálogo administrativo: incluye ofertas activas e inactivas.
router.get(
  "/admin/service-offerings",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    try {
      const serviceOfferings = await db
        .select()
        .from(serviceOfferingsTable)
        .orderBy(serviceOfferingsTable.name);

      const response = ListAdminServiceOfferingsResponse.parse({
        serviceOfferings,
      });

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al consultar catálogo administrativo");

      sendError(res, 500, "No fue posible consultar el catálogo de servicios.");
    }
  },
);

// Crear una oferta.
router.post(
  "/admin/service-offerings",
  requireSameOrigin,
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = CreateServiceOfferingBody.safeParse(req.body);

    if (!parsed.success) {
      sendError(res, 400, "Los datos del servicio no son válidos.");
      return;
    }

    const name = normalizeName(parsed.data.name);
    const description = normalizeDescription(parsed.data.description);

    if (name.length < 2 || name.length > 120) {
      sendError(res, 400, "El nombre del servicio debe tener entre 2 y 120 caracteres.");
      return;
    }

    try {
      if (await nameAlreadyExists(name)) {
        sendError(res, 409, "Ya existe un servicio con ese nombre.");
        return;
      }

      const [created] = await db
        .insert(serviceOfferingsTable)
        .values({
          name,
          description,
          isActive: true,
        })
        .returning();

      const response = CreateServiceOfferingResponse.parse({
        serviceOffering: created,
      });

      res.status(201).json(response);
    } catch (error) {
      if (isUniqueViolation(error)) {
        sendError(res, 409, "Ya existe un servicio con ese nombre.");
        return;
      }

      req.log?.error({ err: error }, "Error al crear servicio");

      sendError(res, 500, "No fue posible crear el servicio.");
    }
  },
);

// Actualizar nombre, descripción o estado. No existe borrado físico.
router.patch(
  "/admin/service-offerings/:serviceOfferingId",
  requireSameOrigin,
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsedParams = UpdateServiceOfferingParams.safeParse({
      serviceOfferingId: req.params.serviceOfferingId,
    });

    if (!parsedParams.success) {
      sendError(res, 400, "El identificador del servicio no es válido.");
      return;
    }

    const parsedBody = UpdateServiceOfferingBody.safeParse(req.body);

    if (!parsedBody.success || Object.keys(req.body ?? {}).length === 0) {
      sendError(res, 400, "Debes proporcionar al menos un campo válido para actualizar.");
      return;
    }

    const serviceOfferingId = parsedParams.data.serviceOfferingId;
    const updates: Partial<typeof serviceOfferingsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsedBody.data.name !== undefined) {
      const name = normalizeName(parsedBody.data.name);

      if (name.length < 2 || name.length > 120) {
        sendError(res, 400, "El nombre del servicio debe tener entre 2 y 120 caracteres.");
        return;
      }

      updates.name = name;
    }

    if (parsedBody.data.description !== undefined) {
      updates.description = normalizeDescription(parsedBody.data.description);
    }

    if (parsedBody.data.isActive !== undefined) {
      updates.isActive = parsedBody.data.isActive;
    }

    try {
      if (
        updates.name &&
        (await nameAlreadyExists(updates.name, serviceOfferingId))
      ) {
        sendError(res, 409, "Ya existe otro servicio con ese nombre.");
        return;
      }

      const [updated] = await db
        .update(serviceOfferingsTable)
        .set(updates)
        .where(eq(serviceOfferingsTable.id, serviceOfferingId))
        .returning();

      if (!updated) {
        sendError(res, 404, "No se encontró el servicio solicitado.");
        return;
      }

      const response = UpdateServiceOfferingResponse.parse({
        serviceOffering: updated,
      });

      res.status(200).json(response);
    } catch (error) {
      if (isUniqueViolation(error)) {
        sendError(res, 409, "Ya existe otro servicio con ese nombre.");
        return;
      }

      req.log?.error({ err: error }, "Error al actualizar servicio");

      sendError(res, 500, "No fue posible actualizar el servicio.");
    }
  },
);

export default router;
