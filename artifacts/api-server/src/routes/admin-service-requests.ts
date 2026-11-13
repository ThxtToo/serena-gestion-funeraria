import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  ApiError,
  GetServiceRequestDetailParams,
  GetServiceRequestDetailResponse,
  ListServiceRequestsQueryParams,
  ListServiceRequestsResponse,
  UpdateServiceRequestStatusBody,
  UpdateServiceRequestStatusParams,
  UpdateServiceRequestStatusResponse,
} from "@workspace/api-zod";
import {
  db,
  serviceRequestStatusHistoryTable,
  serviceRequestsTable,
  usersTable,
  type ServiceRequest,
} from "@workspace/db";
import { requireAdministrator, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

type ServiceRequestStatus = ServiceRequest["status"];

/**
 * Matriz de transiciones de docs/DECISIONES_TECNICAS.md (DT-016).
 * Cualquier otro cambio se rechaza antes de tocar la base de datos.
 */
const ALLOWED_TRANSITIONS: Record<
  ServiceRequestStatus,
  ServiceRequestStatus[]
> = {
  pendiente: ["en_revision", "cancelada"],
  en_revision: ["confirmada", "rechazada", "cancelada"],
  confirmada: ["cancelada"],
  rechazada: [],
  cancelada: [],
};

const STATUS_REQUIRING_REASON: ServiceRequestStatus[] = [
  "rechazada",
  "cancelada",
];

const summaryColumns = {
  id: serviceRequestsTable.id,
  referenceCode: serviceRequestsTable.referenceCode,
  contactName: serviceRequestsTable.contactName,
  contactPhone: serviceRequestsTable.contactPhone,
  serviceType: serviceRequestsTable.serviceType,
  serviceOfferingId: serviceRequestsTable.serviceOfferingId,
  requestedDate: serviceRequestsTable.requestedDate,
  notes: serviceRequestsTable.notes,
  status: serviceRequestsTable.status,
  createdAt: serviceRequestsTable.createdAt,
  updatedAt: serviceRequestsTable.updatedAt,
};

async function loadHistory(serviceRequestId: string) {
  return db
    .select({
      id: serviceRequestStatusHistoryTable.id,
      previousStatus: serviceRequestStatusHistoryTable.previousStatus,
      newStatus: serviceRequestStatusHistoryTable.newStatus,
      changedByUserId: serviceRequestStatusHistoryTable.changedByUserId,
      changedByName: usersTable.fullName,
      reason: serviceRequestStatusHistoryTable.reason,
      createdAt: serviceRequestStatusHistoryTable.createdAt,
    })
    .from(serviceRequestStatusHistoryTable)
    .leftJoin(
      usersTable,
      eq(serviceRequestStatusHistoryTable.changedByUserId, usersTable.id),
    )
    .where(eq(serviceRequestStatusHistoryTable.serviceRequestId, serviceRequestId))
    .orderBy(asc(serviceRequestStatusHistoryTable.createdAt));
}

router.get(
  "/admin/service-requests",
  requireAuth(),
  async (req, res) => {
    const parsed = ListServiceRequestsQueryParams.safeParse(req.query);

    if (!parsed.success) {
      const error: ApiError = { error: "El filtro de estado no es válido." };
      res.status(400).json(error);
      return;
    }

    try {
      const rows = await db
        .select(summaryColumns)
        .from(serviceRequestsTable)
        .orderBy(asc(serviceRequestsTable.createdAt));

      const serviceRequests = rows.filter(
        (row) => !parsed.data.status || row.status === parsed.data.status,
      );

      const response = ListServiceRequestsResponse.parse({ serviceRequests });
      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al listar solicitudes");

      const response: ApiError = {
        error: "No fue posible obtener las solicitudes.",
      };
      res.status(500).json(response);
    }
  },
);

router.get(
  "/admin/service-requests/:serviceRequestId",
  requireAuth(),
  async (req, res) => {
    const parsed = GetServiceRequestDetailParams.safeParse(req.params);

    if (!parsed.success) {
      const error: ApiError = { error: "El identificador no es válido." };
      res.status(400).json(error);
      return;
    }

    try {
      const [serviceRequest] = await db
        .select(summaryColumns)
        .from(serviceRequestsTable)
        .where(eq(serviceRequestsTable.id, parsed.data.serviceRequestId))
        .limit(1);

      if (!serviceRequest) {
        const error: ApiError = { error: "La solicitud no existe." };
        res.status(404).json(error);
        return;
      }

      const history = await loadHistory(serviceRequest.id);
      const response = GetServiceRequestDetailResponse.parse({
        serviceRequest,
        history,
      });

      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al consultar solicitud");

      const response: ApiError = {
        error: "No fue posible consultar la solicitud.",
      };
      res.status(500).json(response);
    }
  },
);

router.patch(
  "/admin/service-requests/:serviceRequestId/status",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const params = UpdateServiceRequestStatusParams.safeParse(req.params);
    const body = UpdateServiceRequestStatusBody.safeParse(req.body);

    if (!params.success) {
      const error: ApiError = { error: "El identificador no es válido." };
      res.status(400).json(error);
      return;
    }

    if (!body.success) {
      const error: ApiError = {
        error: "El estado solicitado no es válido.",
      };
      res.status(400).json(error);
      return;
    }

    const target = body.data.status;
    const reason = body.data.reason?.trim() || null;
    const actor = req.serenaAuth;

    try {
      const outcome = await db.transaction(async (tx) => {
        const [current] = await tx
          .select({
            id: serviceRequestsTable.id,
            status: serviceRequestsTable.status,
          })
          .from(serviceRequestsTable)
          .where(eq(serviceRequestsTable.id, params.data.serviceRequestId))
          .limit(1)
          .for("update");

        if (!current) return { kind: "not-found" as const };

        if (!ALLOWED_TRANSITIONS[current.status].includes(target)) {
          return {
            kind: "invalid-transition" as const,
            from: current.status,
          };
        }

        if (STATUS_REQUIRING_REASON.includes(target) && !reason) {
          return { kind: "reason-required" as const };
        }

        await tx
          .update(serviceRequestsTable)
          .set({ status: target, updatedAt: new Date() })
          .where(eq(serviceRequestsTable.id, current.id));

        await tx.insert(serviceRequestStatusHistoryTable).values({
          serviceRequestId: current.id,
          previousStatus: current.status,
          newStatus: target,
          changedByUserId: actor?.userId ?? null,
          reason,
        });

        return { kind: "ok" as const };
      });

      if (outcome.kind === "not-found") {
        const error: ApiError = { error: "La solicitud no existe." };
        res.status(404).json(error);
        return;
      }

      if (outcome.kind === "invalid-transition") {
        const error: ApiError = {
          error: `No se puede pasar de "${outcome.from}" a "${target}".`,
        };
        res.status(400).json(error);
        return;
      }

      if (outcome.kind === "reason-required") {
        const error: ApiError = {
          error: "El rechazo o la cancelación requiere un motivo.",
        };
        res.status(400).json(error);
        return;
      }

      const [serviceRequest] = await db
        .select(summaryColumns)
        .from(serviceRequestsTable)
        .where(eq(serviceRequestsTable.id, params.data.serviceRequestId))
        .limit(1);

      const history = await loadHistory(params.data.serviceRequestId);
      const response = UpdateServiceRequestStatusResponse.parse({
        serviceRequest,
        history,
      });

      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al cambiar el estado");

      const response: ApiError = {
        error: "No fue posible cambiar el estado de la solicitud.",
      };
      res.status(500).json(response);
    }
  },
);

export default router;
