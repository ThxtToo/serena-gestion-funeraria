import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  ApiError,
  ListAdminFuneralCasesQueryParams,
  ListAdminFuneralCasesResponse,
  CreateAdminFuneralCaseBody,
  CreateAdminFuneralCaseResponse,
  GetAdminFuneralCaseParams,
  GetAdminFuneralCaseResponse,
  UpdateAdminFuneralCaseStatusParams,
  UpdateAdminFuneralCaseStatusBody,
  UpdateAdminFuneralCaseStatusResponse,
} from "@workspace/api-zod";
import {
  db,
  funeralCasesTable,
  funeralCaseStatusHistoryTable,
  serviceRequestsTable,
  usersTable,
  type FuneralCaseStatus,
} from "@workspace/db";
import { and, or, eq, ilike, desc, count } from "drizzle-orm";
import {
  requireAdministrator,
  requireAuth,
  requireSameOrigin,
} from "../middlewares/auth";

const router: IRouter = Router();

const allowedTransitions: Record<FuneralCaseStatus, FuneralCaseStatus[]> = {
  abierto: ["en_preparacion", "programado", "cancelado"],
  en_preparacion: ["programado", "en_ejecucion", "cancelado"],
  programado: ["en_preparacion", "en_ejecucion", "cancelado"],
  en_ejecucion: ["finalizado", "cancelado"],
  finalizado: [],
  cancelado: [],
};

function sendError(
  res: Parameters<Parameters<typeof router.get>[1]>[1],
  status: number,
  message: string,
) {
  const response: ApiError = { error: message };
  res.status(status).json(response);
}

async function getFuneralCaseDetail(caseId: string) {
  const [row] = await db
    .select({
      funeralCase: funeralCasesTable,
      serviceRequestReferenceCode: serviceRequestsTable.referenceCode,
      assignedEmployeeName: usersTable.fullName,
    })
    .from(funeralCasesTable)
    .innerJoin(
      serviceRequestsTable,
      eq(funeralCasesTable.serviceRequestId, serviceRequestsTable.id),
    )
    .leftJoin(
      usersTable,
      eq(funeralCasesTable.assignedEmployeeId, usersTable.id),
    )
    .where(eq(funeralCasesTable.id, caseId))
    .limit(1);

  if (!row) return null;

  const history = await db
    .select({
      id: funeralCaseStatusHistoryTable.id,
      previousStatus: funeralCaseStatusHistoryTable.previousStatus,
      newStatus: funeralCaseStatusHistoryTable.newStatus,
      changedByUserId: funeralCaseStatusHistoryTable.changedByUserId,
      changedByName: usersTable.fullName,
      observation: funeralCaseStatusHistoryTable.observation,
      createdAt: funeralCaseStatusHistoryTable.createdAt,
    })
    .from(funeralCaseStatusHistoryTable)
    .innerJoin(
      usersTable,
      eq(funeralCaseStatusHistoryTable.changedByUserId, usersTable.id),
    )
    .where(eq(funeralCaseStatusHistoryTable.funeralCaseId, caseId))
    .orderBy(
      desc(funeralCaseStatusHistoryTable.createdAt),
      desc(funeralCaseStatusHistoryTable.id),
    );

  return {
    funeralCase: {
      ...row.funeralCase,
      serviceRequestReferenceCode: row.serviceRequestReferenceCode,
      assignedEmployeeName: row.assignedEmployeeName,
    },
    history,
  };
}

router.get(
  "/admin/funeral-cases",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = ListAdminFuneralCasesQueryParams.safeParse(req.query);

    if (!parsed.success) {
      sendError(res, 400, "Los filtros de búsqueda no son válidos.");
      return;
    }

    const { status, search, assignedEmployeeId, page, limit } = parsed.data;
    const conditions = [];

    if (status) {
      conditions.push(eq(funeralCasesTable.status, status));
    }

    if (assignedEmployeeId) {
      conditions.push(
        eq(funeralCasesTable.assignedEmployeeId, assignedEmployeeId),
      );
    }

    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      const pattern = `%${normalizedSearch}%`;
      conditions.push(
        or(
          ilike(funeralCasesTable.caseNumber, pattern),
          ilike(serviceRequestsTable.referenceCode, pattern),
          ilike(funeralCasesTable.deceasedFullName, pattern),
          ilike(funeralCasesTable.responsibleContactName, pattern),
          ilike(funeralCasesTable.responsibleContactPhone, pattern),
          ilike(usersTable.fullName, pattern),
        )!,
      );
    }

    const whereClause = conditions.length
      ? and(...conditions)
      : undefined;

    try {
      const [rows, totalResult] = await Promise.all([
        db
          .select({
            funeralCase: funeralCasesTable,
            serviceRequestReferenceCode: serviceRequestsTable.referenceCode,
            assignedEmployeeName: usersTable.fullName,
          })
          .from(funeralCasesTable)
          .innerJoin(
            serviceRequestsTable,
            eq(funeralCasesTable.serviceRequestId, serviceRequestsTable.id),
          )
          .leftJoin(
            usersTable,
            eq(funeralCasesTable.assignedEmployeeId, usersTable.id),
          )
          .where(whereClause)
          .orderBy(desc(funeralCasesTable.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        db
          .select({ total: count() })
          .from(funeralCasesTable)
          .innerJoin(
            serviceRequestsTable,
            eq(funeralCasesTable.serviceRequestId, serviceRequestsTable.id),
          )
          .leftJoin(
            usersTable,
            eq(funeralCasesTable.assignedEmployeeId, usersTable.id),
          )
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;

      const response = ListAdminFuneralCasesResponse.parse({
        funeralCases: rows.map((row) => ({
          ...row.funeralCase,
          serviceRequestReferenceCode: row.serviceRequestReferenceCode,
          assignedEmployeeName: row.assignedEmployeeName,
        })),
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
      req.log?.error({ err: error }, "Error al listar expedientes");
      sendError(res, 500, "No fue posible consultar los expedientes.");
    }
  },
);

router.post(
  "/admin/funeral-cases",
  requireSameOrigin,
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = CreateAdminFuneralCaseBody.safeParse(req.body);

    if (
      !parsed.success ||
      parsed.data.deceasedFullName.trim().length < 2 ||
      parsed.data.responsibleContactName.trim().length < 2 ||
      parsed.data.responsibleContactPhone.trim().length < 5
    ) {
      sendError(res, 400, "Los datos del expediente no son válidos.");
      return;
    }

    const input = parsed.data;
    const actorUserId = req.serenaAuth!.userId;

    try {
      const result = await db.transaction(async (tx) => {
        const [serviceRequest] = await tx
          .select()
          .from(serviceRequestsTable)
          .where(eq(serviceRequestsTable.id, input.serviceRequestId))
          .limit(1)
          .for("update");

        if (!serviceRequest) {
          return { error: "request_not_found" as const };
        }

        if (serviceRequest.status !== "confirmada") {
          return { error: "request_not_confirmed" as const };
        }

        const [existingCase] = await tx
          .select({ id: funeralCasesTable.id })
          .from(funeralCasesTable)
          .where(
            eq(funeralCasesTable.serviceRequestId, input.serviceRequestId),
          )
          .limit(1);

        if (existingCase) {
          return { error: "already_exists" as const };
        }

        let assignedEmployeeName: string | null = null;

        if (input.assignedEmployeeId) {
          const [employee] = await tx
            .select({
              id: usersTable.id,
              fullName: usersTable.fullName,
            })
            .from(usersTable)
            .where(
              and(
                eq(usersTable.id, input.assignedEmployeeId),
                eq(usersTable.roleId, "empleado"),
                eq(usersTable.isActive, true),
              ),
            )
            .limit(1)
            .for("update");

          if (!employee) {
            return { error: "invalid_employee" as const };
          }

          assignedEmployeeName = employee.fullName;
        }

        const caseNumber = `EXP-${new Date().getFullYear()}-${randomBytes(4)
          .toString("hex")
          .toUpperCase()}`;

        const [created] = await tx
          .insert(funeralCasesTable)
          .values({
            caseNumber,
            serviceRequestId: input.serviceRequestId,
            deceasedFullName: input.deceasedFullName.trim(),
            deceasedDateOfDeath: input.deceasedDateOfDeath,
            serviceLocation: input.serviceLocation?.trim() || null,
            responsibleContactName: input.responsibleContactName.trim(),
            responsibleContactPhone: input.responsibleContactPhone.trim(),
            assignedEmployeeId: input.assignedEmployeeId ?? null,
            status: "abierto",
            notes: input.notes?.trim() || null,
            createdByUserId: actorUserId,
          })
          .returning();

        await tx.insert(funeralCaseStatusHistoryTable).values({
          funeralCaseId: created.id,
          previousStatus: null,
          newStatus: "abierto",
          changedByUserId: actorUserId,
          observation: "Expediente creado desde solicitud confirmada.",
        });

        return {
          error: null,
          caseId: created.id,
          assignedEmployeeName,
        };
      });

      if (result.error === "request_not_found") {
        sendError(res, 404, "No se encontró la solicitud de servicio.");
        return;
      }

      if (result.error === "request_not_confirmed") {
        sendError(
          res,
          409,
          "Solo se pueden crear expedientes desde solicitudes confirmadas.",
        );
        return;
      }

      if (result.error === "already_exists") {
        sendError(res, 409, "Esta solicitud ya tiene un expediente asociado.");
        return;
      }

      if (result.error === "invalid_employee") {
        sendError(
          res,
          400,
          "El empleado asignado no existe, está inactivo o no tiene el rol requerido.",
        );
        return;
      }

      const detail = await getFuneralCaseDetail(result.caseId);
      if (!detail) {
        sendError(res, 500, "El expediente fue creado, pero no pudo consultarse.");
        return;
      }

      const response = CreateAdminFuneralCaseResponse.parse(detail);
      res.setHeader("Cache-Control", "no-store");
      res.status(201).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al crear expediente");

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        sendError(res, 409, "El expediente ya existe o la solicitud ya fue procesada.");
        return;
      }

      sendError(res, 500, "No fue posible crear el expediente.");
    }
  },
);

router.get(
  "/admin/funeral-cases/:caseId",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = GetAdminFuneralCaseParams.safeParse({
      caseId: req.params.caseId,
    });

    if (!parsed.success) {
      sendError(res, 400, "El identificador del expediente no es válido.");
      return;
    }

    try {
      const detail = await getFuneralCaseDetail(parsed.data.caseId);

      if (!detail) {
        sendError(res, 404, "No se encontró el expediente.");
        return;
      }

      const response = GetAdminFuneralCaseResponse.parse(detail);
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al consultar expediente");
      sendError(res, 500, "No fue posible consultar el expediente.");
    }
  },
);

router.patch(
  "/admin/funeral-cases/:caseId/status",
  requireSameOrigin,
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsedParams = UpdateAdminFuneralCaseStatusParams.safeParse({
      caseId: req.params.caseId,
    });
    const parsedBody = UpdateAdminFuneralCaseStatusBody.safeParse(req.body);

    if (!parsedParams.success) {
      sendError(res, 400, "El identificador del expediente no es válido.");
      return;
    }

    if (!parsedBody.success) {
      sendError(res, 400, "Los datos del cambio de estado no son válidos.");
      return;
    }

    const { caseId } = parsedParams.data;
    const { status, observation } = parsedBody.data;
    const actorUserId = req.serenaAuth!.userId;

    try {
      const result = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(funeralCasesTable)
          .where(eq(funeralCasesTable.id, caseId))
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

        await tx
          .update(funeralCasesTable)
          .set({ status, updatedAt: new Date() })
          .where(eq(funeralCasesTable.id, caseId));

        await tx.insert(funeralCaseStatusHistoryTable).values({
          funeralCaseId: caseId,
          previousStatus: current.status,
          newStatus: status,
          changedByUserId: actorUserId,
          observation: observation?.trim() || null,
        });

        return { error: null };
      });

      if (result.error === "not_found") {
        sendError(res, 404, "No se encontró el expediente.");
        return;
      }

      if (result.error === "invalid_transition") {
        sendError(
          res,
          409,
          `No se permite cambiar el estado de "${result.currentStatus}" a "${status}".`,
        );
        return;
      }

      const detail = await getFuneralCaseDetail(caseId);
      if (!detail) {
        sendError(res, 404, "No se encontró el expediente.");
        return;
      }

      const response = UpdateAdminFuneralCaseStatusResponse.parse(detail);
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(response);
    } catch (error) {
      req.log?.error({ err: error }, "Error al cambiar estado del expediente");
      sendError(res, 500, "No fue posible actualizar el estado.");
    }
  },
);

export default router;
