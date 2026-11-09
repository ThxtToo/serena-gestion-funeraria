import { Router, type IRouter } from "express";
import {
  ApiError,
  ListAdminServiceRequestsQueryParams,
  ListAdminServiceRequestsResponse,
  GetAdminServiceRequestParams,
  GetAdminServiceRequestResponse,
  UpdateAdminServiceRequestStatusParams,
  UpdateAdminServiceRequestStatusBody,
  UpdateAdminServiceRequestStatusResponse,
} from "@workspace/api-zod";
import {
  db,
  serviceRequestsTable,
  serviceRequestStatusHistoryTable,
  usersTable,
} from "@workspace/db";
import {
  and,
  or,
  eq,
  ilike,
  desc,
  count,
} from "drizzle-orm";
import {
  requireAdministrator,
  requireAuth,
  requireSameOrigin,
} from "../middlewares/auth";

const router: IRouter = Router();

const allowedTransitions: Record<string, string[]> = {
  pendiente: ["en_revision", "rechazada", "cancelada"],
  en_revision: ["confirmada", "rechazada", "cancelada"],
  confirmada: ["cancelada"],
  rechazada: [],
  cancelada: [],
};

function sendError(
  res: Parameters<Parameters<typeof router.get>[1]>[1],
  status: number,
  message: string,
) {
  const response: ApiError = { error: message };
  res.status(status).json(response);
}

async function getRequestDetail(requestId: string) {
  const [serviceRequest] = await db
    .select()
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, requestId))
    .limit(1);

  if (!serviceRequest) return null;

  const history = await db
    .select({
      id: serviceRequestStatusHistoryTable.id,
      previousStatus: serviceRequestStatusHistoryTable.previousStatus,
      newStatus: serviceRequestStatusHistoryTable.newStatus,
      changedByUserId: serviceRequestStatusHistoryTable.changedByUserId,
      changedByName: usersTable.fullName,
      observation: serviceRequestStatusHistoryTable.observation,
      createdAt: serviceRequestStatusHistoryTable.createdAt,
    })
    .from(serviceRequestStatusHistoryTable)
    .leftJoin(
      usersTable,
      eq(
        serviceRequestStatusHistoryTable.changedByUserId,
        usersTable.id,
      ),
    )
    .where(
      eq(serviceRequestStatusHistoryTable.serviceRequestId, requestId),
    )
    .orderBy(
      desc(serviceRequestStatusHistoryTable.createdAt),
      desc(serviceRequestStatusHistoryTable.id),
    );

  return { serviceRequest, history };
}

router.get(
  "/admin/service-requests",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = ListAdminServiceRequestsQueryParams.safeParse(req.query);

    if (!parsed.success) {
      sendError(res, 400, "Los filtros de búsqueda no son válidos.");
      return;
    }

    const { status, search, page, limit } = parsed.data;
    const conditions = [];

    if (status) {
      conditions.push(eq(serviceRequestsTable.status, status));
    }

    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      const pattern = `%${normalizedSearch}%`;
      conditions.push(
        or(
          ilike(serviceRequestsTable.referenceCode, pattern),
          ilike(serviceRequestsTable.contactName, pattern),
          ilike(serviceRequestsTable.contactPhone, pattern),
        )!,
      );
    }

    const whereClause = conditions.length
      ? and(...conditions)
      : undefined;

    try {
      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(serviceRequestsTable)
          .where(whereClause)
          .orderBy(desc(serviceRequestsTable.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        db
          .select({ total: count() })
          .from(serviceRequestsTable)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      const response = ListAdminServiceRequestsResponse.parse({
        serviceRequests: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al listar solicitudes");
      sendError(res, 500, "No fue posible consultar las solicitudes.");
    }
  },
);

router.get(
  "/admin/service-requests/:requestId",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = GetAdminServiceRequestParams.safeParse({
      requestId: req.params.requestId,
    });

    if (!parsed.success) {
      sendError(res, 400, "El identificador de la solicitud no es válido.");
      return;
    }

    try {
      const detail = await getRequestDetail(parsed.data.requestId);

      if (!detail) {
        sendError(res, 404, "No se encontró la solicitud.");
        return;
      }

      const response = GetAdminServiceRequestResponse.parse(detail);

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al consultar detalle de solicitud");
      sendError(res, 500, "No fue posible consultar el detalle.");
    }
  },
);

router.patch(
  "/admin/service-requests/:requestId/status",
  requireSameOrigin,
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsedParams = UpdateAdminServiceRequestStatusParams.safeParse({
      requestId: req.params.requestId,
    });

    if (!parsedParams.success) {
      sendError(res, 400, "El identificador de la solicitud no es válido.");
      return;
    }

    const parsedBody = UpdateAdminServiceRequestStatusBody.safeParse(req.body);

    if (!parsedBody.success) {
      sendError(res, 400, "Los datos del cambio de estado no son válidos.");
      return;
    }

    const { requestId } = parsedParams.data;
    const { status, observation } = parsedBody.data;

    try {
      const result = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(serviceRequestsTable)
          .where(eq(serviceRequestsTable.id, requestId))
          .limit(1)
          .for("update");

        if (!current) {
          return { error: "not_found" as const };
        }

        const allowed = allowedTransitions[current.status] ?? [];

        if (!allowed.includes(status)) {
          return {
            error: "invalid_transition" as const,
            currentStatus: current.status,
          };
        }

        const now = new Date();

        const [updated] = await tx
          .update(serviceRequestsTable)
          .set({ status, updatedAt: now })
          .where(eq(serviceRequestsTable.id, requestId))
          .returning();

        await tx.insert(serviceRequestStatusHistoryTable).values({
          serviceRequestId: requestId,
          previousStatus: current.status,
          newStatus: status,
          changedByUserId: req.serenaAuth!.userId,
          observation: observation?.trim() || null,
        });

        return { error: null as null, updated };
      });

      if (result.error === "not_found") {
        sendError(res, 404, "No se encontró la solicitud.");
        return;
      }

      if (result.error === "invalid_transition") {
        sendError(
          res,
          409,
          `No se permite cambiar el estado de ${result.currentStatus} a ${status}.`,
        );
        return;
      }

      const detail = await getRequestDetail(requestId);

      if (!detail) {
        sendError(res, 404, "No se encontró la solicitud.");
        return;
      }

      const response = UpdateAdminServiceRequestStatusResponse.parse(detail);
      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al cambiar estado de solicitud");
      sendError(res, 500, "No fue posible actualizar el estado de la solicitud.");
    }
  },
);

export default router;
