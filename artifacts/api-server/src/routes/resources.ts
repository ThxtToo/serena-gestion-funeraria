import { Router, type IRouter } from "express";
import { and, asc, eq, gt, lt, ne, sql } from "drizzle-orm";
import {
  ApiError,
  CancelResourceAssignmentBody,
  CancelResourceAssignmentParams,
  CancelResourceAssignmentResponse,
  CreateResourceAssignmentBody,
  CreateResourceAssignmentParams,
  CreateResourceAssignmentResponse,
  CreateResourceBody,
  CreateResourceResponse,
  ListRequestAssignmentsParams,
  ListRequestAssignmentsResponse,
  ListResourceAssignmentsParams,
  ListResourceAssignmentsResponse,
  ListResourcesQueryParams,
  ListResourcesResponse,
  UpdateResourceBody,
  UpdateResourceParams,
  UpdateResourceResponse,
} from "@workspace/api-zod";
import {
  db,
  resourceAssignmentsTable,
  resourcesTable,
  serviceRequestsTable,
  usersTable,
} from "@workspace/db";
import { requireAdministrator, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const resourceColumns = {
  id: resourcesTable.id,
  name: resourcesTable.name,
  type: resourcesTable.type,
  description: resourcesTable.description,
  status: resourcesTable.status,
  createdAt: resourcesTable.createdAt,
  updatedAt: resourcesTable.updatedAt,
};

type ResourceRow = {
  id: string;
  name: string;
  type: "sala" | "vehiculo" | "equipo" | "otro";
  description: string | null;
  status: "disponible" | "mantenimiento" | "fuera_de_servicio";
  createdAt: Date;
  updatedAt: Date;
};

function withAvailability(row: ResourceRow, busy: boolean) {
  return { ...row, available: row.status === "disponible" && !busy };
}

async function busyResourceIds(startAt: Date, endAt: Date): Promise<Set<string>> {
  const conflicts = await db
    .select({ resourceId: resourceAssignmentsTable.resourceId })
    .from(resourceAssignmentsTable)
    .where(
      and(
        eq(resourceAssignmentsTable.status, "activa"),
        lt(resourceAssignmentsTable.startAt, endAt),
        gt(resourceAssignmentsTable.endAt, startAt),
      ),
    );

  return new Set(conflicts.map((conflict) => conflict.resourceId));
}

const assignmentColumns = {
  id: resourceAssignmentsTable.id,
  serviceRequestId: resourceAssignmentsTable.serviceRequestId,
  referenceCode: serviceRequestsTable.referenceCode,
  resourceId: resourceAssignmentsTable.resourceId,
  resourceName: resourcesTable.name,
  startAt: resourceAssignmentsTable.startAt,
  endAt: resourceAssignmentsTable.endAt,
  status: resourceAssignmentsTable.status,
  cancellationReason: resourceAssignmentsTable.cancellationReason,
  assignedByName: usersTable.fullName,
  createdAt: resourceAssignmentsTable.createdAt,
};

function assignmentQuery() {
  return db
    .select(assignmentColumns)
    .from(resourceAssignmentsTable)
    .innerJoin(
      serviceRequestsTable,
      eq(resourceAssignmentsTable.serviceRequestId, serviceRequestsTable.id),
    )
    .innerJoin(
      resourcesTable,
      eq(resourceAssignmentsTable.resourceId, resourcesTable.id),
    )
    .leftJoin(
      usersTable,
      eq(resourceAssignmentsTable.assignedByUserId, usersTable.id),
    );
}

router.get("/admin/resources", requireAuth(), async (req, res) => {
  const parsed = ListResourcesQueryParams.safeParse(req.query);

  if (!parsed.success) {
    const error: ApiError = { error: "Los parámetros no son válidos." };
    res.status(400).json(error);
    return;
  }

  const { startAt, endAt } = parsed.data;

  if ((startAt && !endAt) || (!startAt && endAt) || (startAt && endAt && startAt >= endAt)) {
    const error: ApiError = {
      error: "Indica un período válido: inicio anterior al fin.",
    };
    res.status(400).json(error);
    return;
  }

  try {
    const rows = await db
      .select(resourceColumns)
      .from(resourcesTable)
      .orderBy(asc(resourcesTable.name));

    const busy = startAt && endAt ? await busyResourceIds(startAt, endAt) : new Set<string>();

    const response = ListResourcesResponse.parse({
      resources: rows.map((row) => withAvailability(row, busy.has(row.id))),
    });

    res.status(200).json(response);
  } catch (error) {
    req.log?.error({ err: error }, "Error al listar recursos");

    const response: ApiError = {
      error: "No fue posible obtener los recursos.",
    };
    res.status(500).json(response);
  }
});

router.post(
  "/admin/resources",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = CreateResourceBody.safeParse(req.body);

    if (!parsed.success) {
      const error: ApiError = { error: "Los datos del recurso no son válidos." };
      res.status(400).json(error);
      return;
    }

    const data = parsed.data;

    try {
      const [duplicate] = await db
        .select({ id: resourcesTable.id })
        .from(resourcesTable)
        .where(
          sql`lower(trim(${resourcesTable.name})) = lower(trim(${data.name}))`,
        )
        .limit(1);

      if (duplicate) {
        const error: ApiError = { error: "Ya existe un recurso con ese nombre." };
        res.status(409).json(error);
        return;
      }

      const [created] = await db
        .insert(resourcesTable)
        .values({
          name: data.name.trim(),
          type: data.type,
          description: data.description?.trim() || null,
          status: data.status ?? "disponible",
        })
        .returning(resourceColumns);

      const response = CreateResourceResponse.parse({
        resource: withAvailability(created, false),
      });

      res.status(201).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al crear recurso");

      const response: ApiError = { error: "No fue posible crear el recurso." };
      res.status(500).json(response);
    }
  },
);

router.patch(
  "/admin/resources/:resourceId",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const params = UpdateResourceParams.safeParse(req.params);
    const body = UpdateResourceBody.safeParse(req.body);

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
        .update(resourcesTable)
        .set({
          ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
          ...(changes.description !== undefined
            ? { description: changes.description?.trim() || null }
            : {}),
          ...(changes.status !== undefined ? { status: changes.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(resourcesTable.id, params.data.resourceId))
        .returning(resourceColumns);

      if (!updated) {
        const error: ApiError = { error: "El recurso no existe." };
        res.status(404).json(error);
        return;
      }

      const response = UpdateResourceResponse.parse({
        resource: withAvailability(updated, false),
      });

      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al actualizar recurso");

      const response: ApiError = {
        error: "No fue posible actualizar el recurso.",
      };
      res.status(500).json(response);
    }
  },
);

router.get(
  "/admin/resources/:resourceId/assignments",
  requireAuth(),
  async (req, res) => {
    const parsed = ListResourceAssignmentsParams.safeParse(req.params);

    if (!parsed.success) {
      const error: ApiError = { error: "El identificador no es válido." };
      res.status(400).json(error);
      return;
    }

    try {
      const [resource] = await db
        .select({ id: resourcesTable.id })
        .from(resourcesTable)
        .where(eq(resourcesTable.id, parsed.data.resourceId))
        .limit(1);

      if (!resource) {
        const error: ApiError = { error: "El recurso no existe." };
        res.status(404).json(error);
        return;
      }

      const rows = await assignmentQuery()
        .where(eq(resourceAssignmentsTable.resourceId, resource.id))
        .orderBy(asc(resourceAssignmentsTable.startAt));

      const response = ListResourceAssignmentsResponse.parse({
        assignments: rows,
      });

      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al listar asignaciones");

      const response: ApiError = {
        error: "No fue posible obtener las asignaciones.",
      };
      res.status(500).json(response);
    }
  },
);

router.get(
  "/admin/service-requests/:serviceRequestId/assignments",
  requireAuth(),
  async (req, res) => {
    const parsed = ListRequestAssignmentsParams.safeParse(req.params);

    if (!parsed.success) {
      const error: ApiError = { error: "El identificador no es válido." };
      res.status(400).json(error);
      return;
    }

    try {
      const [request] = await db
        .select({ id: serviceRequestsTable.id })
        .from(serviceRequestsTable)
        .where(eq(serviceRequestsTable.id, parsed.data.serviceRequestId))
        .limit(1);

      if (!request) {
        const error: ApiError = { error: "La solicitud no existe." };
        res.status(404).json(error);
        return;
      }

      const rows = await assignmentQuery()
        .where(eq(resourceAssignmentsTable.serviceRequestId, request.id))
        .orderBy(asc(resourceAssignmentsTable.startAt));

      const response = ListRequestAssignmentsResponse.parse({
        assignments: rows,
      });

      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al listar asignaciones");

      const response: ApiError = {
        error: "No fue posible obtener las asignaciones.",
      };
      res.status(500).json(response);
    }
  },
);

router.post(
  "/admin/service-requests/:serviceRequestId/assignments",
  requireAuth(),
  async (req, res) => {
    const params = CreateResourceAssignmentParams.safeParse(req.params);
    const body = CreateResourceAssignmentBody.safeParse(req.body);

    if (!params.success || !body.success) {
      const error: ApiError = { error: "Los datos de la asignación no son válidos." };
      res.status(400).json(error);
      return;
    }

    const { resourceId, startAt, endAt } = body.data;

    if (startAt >= endAt) {
      const error: ApiError = {
        error: "El inicio del período debe ser anterior al fin.",
      };
      res.status(400).json(error);
      return;
    }

    try {
      const outcome = await db.transaction(async (tx) => {
        const [request] = await tx
          .select({
            id: serviceRequestsTable.id,
            status: serviceRequestsTable.status,
          })
          .from(serviceRequestsTable)
          .where(eq(serviceRequestsTable.id, params.data.serviceRequestId))
          .limit(1);

        if (!request) return { kind: "request-not-found" as const };

        if (request.status === "rechazada" || request.status === "cancelada") {
          return { kind: "request-closed" as const };
        }

        const [resource] = await tx
          .select({
            id: resourcesTable.id,
            status: resourcesTable.status,
          })
          .from(resourcesTable)
          .where(eq(resourcesTable.id, resourceId))
          .limit(1)
          .for("update");

        if (!resource) return { kind: "resource-not-found" as const };

        if (resource.status !== "disponible") {
          return { kind: "resource-unavailable" as const };
        }

        const [conflict] = await tx
          .select({ id: resourceAssignmentsTable.id })
          .from(resourceAssignmentsTable)
          .where(
            and(
              eq(resourceAssignmentsTable.resourceId, resource.id),
              eq(resourceAssignmentsTable.status, "activa"),
              lt(resourceAssignmentsTable.startAt, endAt),
              gt(resourceAssignmentsTable.endAt, startAt),
            ),
          )
          .limit(1);

        if (conflict) return { kind: "overlap" as const };

        const [created] = await tx
          .insert(resourceAssignmentsTable)
          .values({
            serviceRequestId: request.id,
            resourceId: resource.id,
            startAt,
            endAt,
            status: "activa",
            assignedByUserId: req.serenaAuth?.userId ?? null,
          })
          .returning({ id: resourceAssignmentsTable.id });

        return { kind: "created" as const, id: created.id };
      });

      if (outcome.kind !== "created") {
        const errors: Record<string, { status: number; message: string }> = {
          "request-not-found": { status: 404, message: "La solicitud no existe." },
          "resource-not-found": { status: 404, message: "El recurso no existe." },
          "request-closed": {
            status: 400,
            message: "No se pueden asignar recursos a una solicitud cerrada.",
          },
          "resource-unavailable": {
            status: 400,
            message: "El recurso no está disponible operativamente.",
          },
          overlap: {
            status: 409,
            message: "El recurso ya está asignado en un período que se superpone.",
          },
        };

        const mapped = errors[outcome.kind];
        const error: ApiError = { error: mapped.message };
        res.status(mapped.status).json(error);
        return;
      }

      const [assignment] = await assignmentQuery().where(
        eq(resourceAssignmentsTable.id, outcome.id),
      );

      const response = CreateResourceAssignmentResponse.parse({ assignment });
      res.status(201).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al crear asignación");

      const response: ApiError = {
        error: "No fue posible registrar la asignación.",
      };
      res.status(500).json(response);
    }
  },
);

router.patch(
  "/admin/resource-assignments/:assignmentId/cancel",
  requireAuth(),
  async (req, res) => {
    const params = CancelResourceAssignmentParams.safeParse(req.params);
    const body = CancelResourceAssignmentBody.safeParse(req.body ?? {});

    if (!params.success || !body.success) {
      const error: ApiError = { error: "Los datos enviados no son válidos." };
      res.status(400).json(error);
      return;
    }

    try {
      const [current] = await db
        .select({
          id: resourceAssignmentsTable.id,
          status: resourceAssignmentsTable.status,
        })
        .from(resourceAssignmentsTable)
        .where(eq(resourceAssignmentsTable.id, params.data.assignmentId))
        .limit(1)
        .for("update");

      if (!current) {
        const error: ApiError = { error: "La asignación no existe." };
        res.status(404).json(error);
        return;
      }

      if (current.status !== "activa") {
        const error: ApiError = {
          error: "Solo se puede cancelar una asignación activa.",
        };
        res.status(400).json(error);
        return;
      }

      await db
        .update(resourceAssignmentsTable)
        .set({
          status: "cancelada",
          cancellationReason: body.data.reason?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(resourceAssignmentsTable.id, current.id));

      const [assignment] = await assignmentQuery().where(
        eq(resourceAssignmentsTable.id, current.id),
      );

      const response = CancelResourceAssignmentResponse.parse({ assignment });
      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al cancelar asignación");

      const response: ApiError = {
        error: "No fue posible cancelar la asignación.",
      };
      res.status(500).json(response);
    }
  },
);

export default router;
