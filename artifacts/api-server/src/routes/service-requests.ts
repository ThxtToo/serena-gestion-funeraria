import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  ApiError,
  CreateServiceRequestBody,
  CreateServiceRequestResponse,
  GetServiceRequestParams,
  GetServiceRequestResponse,
} from "@workspace/api-zod";
import { db, serviceRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function generateReferenceCode(): string {
  return `SER-${randomBytes(5).toString("hex").toUpperCase()}`;
}

router.post("/service-requests", async (req, res) => {
  const parsed = CreateServiceRequestBody.safeParse(req.body);

  if (!parsed.success) {
    const error: ApiError = {
      error: "Los datos de la solicitud no son válidos.",
    };

    res.status(400).json(error);
    return;
  }

  try {
    const [created] = await db
      .insert(serviceRequestsTable)
      .values({
        referenceCode: generateReferenceCode(),
        contactName: parsed.data.contactName,
        contactPhone: parsed.data.contactPhone,
        serviceType: parsed.data.serviceType,
        requestedDate: parsed.data.requestedDate,
        notes: parsed.data.notes,
        status: "pendiente",
      })
      .returning({
        referenceCode: serviceRequestsTable.referenceCode,
        status: serviceRequestsTable.status,
      });

    const response = CreateServiceRequestResponse.parse({
      referenceCode: created.referenceCode,
      status: created.status,
      message:
        "Solicitud recibida para revisión. El servicio aún no está confirmado.",
    });

    res.status(201).json(response);
  } catch (error) {
    req.log?.error({ err: error }, "Error al crear solicitud de servicio");

    const response: ApiError = {
      error: "No fue posible registrar la solicitud. Inténtalo nuevamente.",
    };

    res.status(500).json(response);
  }
});

router.get("/service-requests/:referenceCode", async (req, res) => {
  const parsed = GetServiceRequestParams.safeParse({
    referenceCode: req.params.referenceCode,
  });

  if (!parsed.success) {
    const error: ApiError = {
      error: "El código de referencia no es válido.",
    };

    res.status(400).json(error);
    return;
  }

  try {
    const [request] = await db
      .select({
        referenceCode: serviceRequestsTable.referenceCode,
        status: serviceRequestsTable.status,
      })
      .from(serviceRequestsTable)
      .where(
        eq(serviceRequestsTable.referenceCode, parsed.data.referenceCode),
      )
      .limit(1);

    if (!request) {
      const error: ApiError = {
        error: "No se encontró una solicitud con ese código de referencia.",
      };

      res.status(404).json(error);
      return;
    }

    const response = GetServiceRequestResponse.parse({
      referenceCode: request.referenceCode,
      status: request.status,
      message:
        request.status === "pendiente"
          ? "La solicitud está pendiente de revisión."
          : `Estado actual de la solicitud: ${request.status}.`,
    });

    res.status(200).json(response);
  } catch (error) {
    req.log?.error({ err: error }, "Error al consultar solicitud");

    const response: ApiError = {
      error: "No fue posible consultar la solicitud.",
    };

    res.status(500).json(response);
  }
});
export default router;