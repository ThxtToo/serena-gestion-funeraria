import { Router, type IRouter } from "express";
import {
  ApiError,
  ListAdminFuneralCasesQueryParams,
  ListAdminFuneralCasesResponse,
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
import { and, eq, ilike, or, desc, count } from "drizzle-orm";
import {
  requireEmployee,
  requireAuth,
  requireSameOrigin,
} from "../middlewares/auth";

const router: IRouter = Router();

const employeeTransitions: Record<FuneralCaseStatus, FuneralCaseStatus[]> = {
  abierto: ["en_preparacion"],
  en_preparacion: ["programado", "en_ejecucion"],
  programado: ["en_preparacion", "en_ejecucion"],
  en_ejecucion: ["finalizado"],
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

router.get(
  "/employee/funeral-cases",
  requireAuth(),
  requireEmployee,
  async (req, res) => {
    try {
      const parsed = ListAdminFuneralCasesQueryParams.safeParse(req.query);
      if (!parsed.success) {
        sendError(res, 400, "Los filtros de búsqueda no son válidos.");
        return;
      }
      const params = parsed.data;
      const employeeId = req.serenaAuth!.userId;
      const page = params.page ?? 1;
      const limit = params.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [
        eq(funeralCasesTable.assignedEmployeeId, employeeId),
      ];

      if (params.status) {
        conditions.push(eq(funeralCasesTable.status, params.status));
      }

      if (params.search?.trim()) {
        const term = `%${params.search.trim()}%`;
        conditions.push(
          or(
            ilike(funeralCasesTable.caseNumber, term),
            ilike(serviceRequestsTable.referenceCode, term),
            ilike(funeralCasesTable.deceasedFullName, term),
          )!,
        );
      }

      const where = and(...conditions);

      const [rows, totals] = await Promise.all([
        db
          .select({
            id: funeralCasesTable.id,
            caseNumber: funeralCasesTable.caseNumber,
            serviceRequestId: funeralCasesTable.serviceRequestId,
            serviceRequestReferenceCode: serviceRequestsTable.referenceCode,
            deceasedFullName: funeralCasesTable.deceasedFullName,
            deceasedDateOfDeath: funeralCasesTable.deceasedDateOfDeath,
            serviceLocation: funeralCasesTable.serviceLocation,
            responsibleContactName: funeralCasesTable.responsibleContactName,
            responsibleContactPhone: funeralCasesTable.responsibleContactPhone,
            assignedEmployeeId: funeralCasesTable.assignedEmployeeId,
            assignedEmployeeName: usersTable.fullName,
            status: funeralCasesTable.status,
            notes: funeralCasesTable.notes,
            createdByUserId: funeralCasesTable.createdByUserId,
            createdAt: funeralCasesTable.createdAt,
            updatedAt: funeralCasesTable.updatedAt,
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
          .where(where)
          .orderBy(desc(funeralCasesTable.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(funeralCasesTable)
          .innerJoin(
            serviceRequestsTable,
            eq(funeralCasesTable.serviceRequestId, serviceRequestsTable.id),
          )
          .where(where),
      ]);

      res.setHeader("Cache-Control", "no-store");
      res.json(
        ListAdminFuneralCasesResponse.parse({
          funeralCases: rows,
          pagination: {
            page,
            limit,
            total: totals[0]?.total ?? 0,
            totalPages: Math.ceil((totals[0]?.total ?? 0) / limit),
          },
        }),
      );
    } catch (error) {
      req.log?.error({ err: error }, "Error en operaciones del empleado sobre expedientes");
      sendError(res, 500, "No fue posible procesar la operación del expediente.");
    }
  },
);

router.get(
  "/employee/funeral-cases/:caseId",
  requireAuth(),
  requireEmployee,
  async (req, res) => {
    try {
      const parsed = GetAdminFuneralCaseParams.safeParse(req.params);
      if (!parsed.success) {
        sendError(res, 400, "El identificador del expediente no es válido.");
        return;
      }
      const { caseId } = parsed.data;
      const employeeId = req.serenaAuth!.userId;

      const [record] = await db
        .select({
          id: funeralCasesTable.id,
          caseNumber: funeralCasesTable.caseNumber,
          serviceRequestId: funeralCasesTable.serviceRequestId,
          serviceRequestReferenceCode: serviceRequestsTable.referenceCode,
          deceasedFullName: funeralCasesTable.deceasedFullName,
          deceasedDateOfDeath: funeralCasesTable.deceasedDateOfDeath,
          serviceLocation: funeralCasesTable.serviceLocation,
          responsibleContactName: funeralCasesTable.responsibleContactName,
          responsibleContactPhone: funeralCasesTable.responsibleContactPhone,
          assignedEmployeeId: funeralCasesTable.assignedEmployeeId,
          assignedEmployeeName: usersTable.fullName,
          status: funeralCasesTable.status,
          notes: funeralCasesTable.notes,
          createdByUserId: funeralCasesTable.createdByUserId,
          createdAt: funeralCasesTable.createdAt,
          updatedAt: funeralCasesTable.updatedAt,
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
        .where(
          and(
            eq(funeralCasesTable.id, caseId),
            eq(funeralCasesTable.assignedEmployeeId, employeeId),
          ),
        )
        .limit(1);

      if (!record) {
        sendError(res, 404, "No se encontró el expediente.");
        return;
      }

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
        .leftJoin(
          usersTable,
          eq(funeralCaseStatusHistoryTable.changedByUserId, usersTable.id),
        )
        .where(eq(funeralCaseStatusHistoryTable.funeralCaseId, caseId))
        .orderBy(desc(funeralCaseStatusHistoryTable.createdAt));

      res.setHeader("Cache-Control", "no-store");
      res.json(GetAdminFuneralCaseResponse.parse({ funeralCase: record, history }));
    } catch (error) {
      req.log?.error({ err: error }, "Error en operaciones del empleado sobre expedientes");
      sendError(res, 500, "No fue posible procesar la operación del expediente.");
    }
  },
);

router.patch(
  "/employee/funeral-cases/:caseId/status",
  requireSameOrigin,
  requireAuth(),
  requireEmployee,
  async (req, res) => {
    try {
      const parsedParams = UpdateAdminFuneralCaseStatusParams.safeParse(req.params);
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
      const body = parsedBody.data;
      const employeeId = req.serenaAuth!.userId;

      const result = await db.transaction(async (tx) => {
        const [record] = await tx
          .select()
          .from(funeralCasesTable)
          .where(
            and(
              eq(funeralCasesTable.id, caseId),
              eq(funeralCasesTable.assignedEmployeeId, employeeId),
            ),
          )
          .for("update")
          .limit(1);

        if (!record) {
          return { kind: "not-found" as const };
        }

        const allowed = employeeTransitions[record.status] ?? [];
        if (!allowed.includes(body.status)) {
          return { kind: "invalid-transition" as const };
        }

        await tx
          .update(funeralCasesTable)
          .set({
            status: body.status,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(funeralCasesTable.id, caseId),
              eq(funeralCasesTable.assignedEmployeeId, employeeId),
            ),
          );

        await tx.insert(funeralCaseStatusHistoryTable).values({
          funeralCaseId: caseId,
          previousStatus: record.status,
          newStatus: body.status,
          changedByUserId: employeeId,
          observation: body.observation?.trim() || null,
        });

        return { kind: "updated" as const };
      });

      if (result.kind === "not-found") {
        sendError(res, 404, "No se encontró el expediente.");
        return;
      }

      if (result.kind === "invalid-transition") {
        sendError(res, 409, "La transición solicitada no está permitida para empleados.");
        return;
      }

      const [record] = await db
        .select({
          id: funeralCasesTable.id,
          caseNumber: funeralCasesTable.caseNumber,
          serviceRequestId: funeralCasesTable.serviceRequestId,
          serviceRequestReferenceCode: serviceRequestsTable.referenceCode,
          deceasedFullName: funeralCasesTable.deceasedFullName,
          deceasedDateOfDeath: funeralCasesTable.deceasedDateOfDeath,
          serviceLocation: funeralCasesTable.serviceLocation,
          responsibleContactName: funeralCasesTable.responsibleContactName,
          responsibleContactPhone: funeralCasesTable.responsibleContactPhone,
          assignedEmployeeId: funeralCasesTable.assignedEmployeeId,
          assignedEmployeeName: usersTable.fullName,
          status: funeralCasesTable.status,
          notes: funeralCasesTable.notes,
          createdByUserId: funeralCasesTable.createdByUserId,
          createdAt: funeralCasesTable.createdAt,
          updatedAt: funeralCasesTable.updatedAt,
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
        .where(
          and(
            eq(funeralCasesTable.id, caseId),
            eq(funeralCasesTable.assignedEmployeeId, employeeId),
          ),
        )
        .limit(1);

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
        .leftJoin(
          usersTable,
          eq(funeralCaseStatusHistoryTable.changedByUserId, usersTable.id),
        )
        .where(eq(funeralCaseStatusHistoryTable.funeralCaseId, caseId))
        .orderBy(desc(funeralCaseStatusHistoryTable.createdAt));

      res.setHeader("Cache-Control", "no-store");
      res.json(
        UpdateAdminFuneralCaseStatusResponse.parse({
          funeralCase: record,
          history,
        }),
      );
    } catch (error) {
      req.log?.error({ err: error }, "Error en operaciones del empleado sobre expedientes");
      sendError(res, 500, "No fue posible procesar la operación del expediente.");
    }
  },
);

export default router;
