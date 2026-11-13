import { and, asc, eq, gt, ilike, inArray, lt, lte } from "drizzle-orm";
import { z } from "zod";
import {
  contactChannelsTable,
  db,
  inventoryItemsTable,
  resourceAssignmentsTable,
  demoPoliciesTable,
  insurersTable,
  resourcesTable,
  serviceOfferingsTable,
  serviceRequestsTable,
} from "@workspace/db";
import { createServiceRequestRecord } from "../service-request-creation";

export interface AgentContext {
  userId: string | null;
  role: string;
  scope: "staff" | "public";
}

export type ToolOutcome =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errorCode: string; message: string };

/**
 * Herramientas que el agente puede ejecutar. Son las únicas operaciones
 * autorizadas: el agente nunca recibe acceso directo a la base de datos ni
 * puede ejecutar SQL propio.
 */
export const AGENT_TOOL_NAMES = [
  "resumen_operativo",
  "solicitudes_pendientes",
  "inventario_bajo",
  "consultar_servicios",
  "consultar_disponibilidad",
  "verificar_poliza_demo",
  "consultar_solicitud",
  "crear_solicitud",
  "contacto_soporte",
] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export const AGENT_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "resumen_operativo",
      description:
        "Resumen del día para el personal: solicitudes por atender, artículos bajo mínimo, recursos disponibles y próximas asignaciones.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "solicitudes_pendientes",
      description:
        "Lista las solicitudes pendientes y en revisión con su referencia, servicio y fecha de recepción.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "inventario_bajo",
      description:
        "Lista los artículos activos cuya existencia está en el mínimo o por debajo.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_servicios",
      description:
        "Lista los servicios activos del catálogo con su descripción. Usa esta herramienta cuando pregunten qué servicios ofrece la funeraria.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_disponibilidad",
      description:
        "Consulta qué recursos (salas, vehículos, equipos) están disponibles en un período. Devuelve solo el estado verificado por el backend en este momento.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          inicio: {
            type: "string",
            description: "Inicio del período en formato ISO 8601.",
          },
          fin: {
            type: "string",
            description: "Fin del período en formato ISO 8601.",
          },
          tipo: {
            type: "string",
            enum: ["sala", "vehiculo", "equipo", "otro"],
            description: "Tipo de recurso a consultar. Opcional.",
          },
        },
        required: ["inicio", "fin"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "verificar_poliza_demo",
      description:
        "Consulta una póliza ficticia de demostración por su código. No consulta aseguradoras reales ni valida cobertura.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          codigo: { type: "string", description: "Código de la póliza ficticia." },
        },
        required: ["codigo"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_solicitud",
      description:
        "Consulta el estado de una solicitud usando su código de referencia. Solo devuelve datos operativos, no datos de contacto.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          referencia: { type: "string", description: "Código con formato SER-XXXXXXXXXX." },
        },
        required: ["referencia"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "crear_solicitud",
      description:
        "Registra una solicitud de servicio con los datos mínimos de contacto. La solicitud queda pendiente: no confirma el servicio ni reserva recursos.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          nombre: { type: "string", description: "Nombre de la persona que solicita." },
          telefono: { type: "string", description: "Teléfono de contacto." },
          servicio: {
            type: "string",
            description: "Nombre del servicio del catálogo, tal como lo dio la persona.",
          },
          fecha: {
            type: "string",
            description: "Fecha deseada en formato ISO 8601. Opcional.",
          },
          notas: { type: "string", description: "Observaciones breves. Opcional." },
        },
        required: ["nombre", "telefono", "servicio"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "contacto_soporte",
      description:
        "Devuelve el canal de atención humana configurado. Úsala cuando la persona pida hablar con alguien o cuando no puedas resolver la consulta.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
];


async function resumenOperativo(): Promise<ToolOutcome> {
  const openRequests = await db
    .select({
      referenceCode: serviceRequestsTable.referenceCode,
      status: serviceRequestsTable.status,
      serviceType: serviceRequestsTable.serviceType,
      createdAt: serviceRequestsTable.createdAt,
    })
    .from(serviceRequestsTable)
    .where(inArray(serviceRequestsTable.status, ["pendiente", "en_revision"]))
    .orderBy(asc(serviceRequestsTable.createdAt))
    .limit(20);

  const lowStock = await db
    .select({
      name: inventoryItemsTable.name,
      quantity: inventoryItemsTable.quantity,
      minimumQuantity: inventoryItemsTable.minimumQuantity,
      unit: inventoryItemsTable.unit,
    })
    .from(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.isActive, true),
        lte(inventoryItemsTable.quantity, inventoryItemsTable.minimumQuantity),
      ),
    );

  const available = await db
    .select({ name: resourcesTable.name, type: resourcesTable.type })
    .from(resourcesTable)
    .where(eq(resourcesTable.status, "disponible"));

  const upcoming = await db
    .select({
      referenceCode: serviceRequestsTable.referenceCode,
      resourceName: resourcesTable.name,
      startAt: resourceAssignmentsTable.startAt,
      endAt: resourceAssignmentsTable.endAt,
    })
    .from(resourceAssignmentsTable)
    .innerJoin(serviceRequestsTable, eq(resourceAssignmentsTable.serviceRequestId, serviceRequestsTable.id))
    .innerJoin(resourcesTable, eq(resourceAssignmentsTable.resourceId, resourcesTable.id))
    .where(and(eq(resourceAssignmentsTable.status, "activa"), gt(resourceAssignmentsTable.endAt, new Date())))
    .orderBy(asc(resourceAssignmentsTable.startAt))
    .limit(5);

  return {
    ok: true,
    data: {
      solicitudes_por_atender: openRequests.length,
      solicitudes: openRequests.slice(0, 5),
      articulos_bajo_minimo: lowStock,
      recursos_disponibles: available.length,
      proximas_asignaciones: upcoming,
    },
  };
}

async function solicitudesPendientes(): Promise<ToolOutcome> {
  const rows = await db
    .select({
      referenceCode: serviceRequestsTable.referenceCode,
      status: serviceRequestsTable.status,
      serviceType: serviceRequestsTable.serviceType,
      contactName: serviceRequestsTable.contactName,
      createdAt: serviceRequestsTable.createdAt,
    })
    .from(serviceRequestsTable)
    .where(inArray(serviceRequestsTable.status, ["pendiente", "en_revision"]))
    .orderBy(asc(serviceRequestsTable.createdAt))
    .limit(15);

  return {
    ok: true,
    data: {
      total: rows.length,
      solicitudes: rows,
      aclaracion: "Ninguna de estas solicitudes está confirmada todavía.",
    },
  };
}

async function inventarioBajo(): Promise<ToolOutcome> {
  const rows = await db
    .select({
      name: inventoryItemsTable.name,
      category: inventoryItemsTable.category,
      quantity: inventoryItemsTable.quantity,
      minimumQuantity: inventoryItemsTable.minimumQuantity,
      unit: inventoryItemsTable.unit,
    })
    .from(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.isActive, true),
        lte(inventoryItemsTable.quantity, inventoryItemsTable.minimumQuantity),
      ),
    );

  return {
    ok: true,
    data: { total: rows.length, articulos: rows },
  };
}

async function consultarServicios(): Promise<ToolOutcome> {
  const rows = await db
    .select({
      name: serviceOfferingsTable.name,
      description: serviceOfferingsTable.description,
    })
    .from(serviceOfferingsTable)
    .where(eq(serviceOfferingsTable.isActive, true));

  return {
    ok: true,
    data: {
      servicios: rows,
      aclaracion:
        "Un servicio disponible en el catálogo no implica que la solicitud esté confirmada.",
    },
  };
}

const availabilityArgs = z.object({
  inicio: z.string().min(4),
  fin: z.string().min(4),
  tipo: z.enum(["sala", "vehiculo", "equipo", "otro"]).optional(),
});

const policyArgs = z.object({ codigo: z.string().min(3).max(40) });
const requestArgs = z.object({ referencia: z.string().min(4).max(40) });
const createArgs = z.object({
  nombre: z.string().min(2).max(120),
  telefono: z.string().min(5).max(30),
  servicio: z.string().min(2).max(120),
  fecha: z.string().optional(),
  notas: z.string().max(1000).optional(),
});

function toDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function consultarDisponibilidad(raw: unknown): Promise<ToolOutcome> {
  const parsed = availabilityArgs.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      errorCode: "argumentos_invalidos",
      message: "Necesito la fecha de inicio y la de fin para consultar la disponibilidad.",
    };
  }

  const startAt = toDate(parsed.data.inicio);
  const endAt = toDate(parsed.data.fin);

  if (!startAt || !endAt || startAt >= endAt) {
    return {
      ok: false,
      errorCode: "periodo_invalido",
      message: "El período no es válido: el inicio debe ser anterior al fin.",
    };
  }

  const rows = await db
    .select({
      id: resourcesTable.id,
      name: resourcesTable.name,
      type: resourcesTable.type,
      status: resourcesTable.status,
    })
    .from(resourcesTable);

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

  const busy = new Set(conflicts.map((conflict) => conflict.resourceId));

  const filtered = rows.filter((row) => !parsed.data.tipo || row.type === parsed.data.tipo);

  return {
    ok: true,
    data: {
      periodo: { inicio: startAt.toISOString(), fin: endAt.toISOString() },
      recursos: filtered.map((row) => ({
        nombre: row.name,
        tipo: row.type,
        disponible: row.status === "disponible" && !busy.has(row.id),
        motivo: row.status !== "disponible" ? `Estado operativo: ${row.status}` : busy.has(row.id) ? "Asignado en ese período" : null,
      })),
      aclaracion:
        "Este resultado refleja el estado del sistema en este momento; no garantiza disponibilidad futura.",
    },
  };
}

async function verificarPoliza(raw: unknown): Promise<ToolOutcome> {
  const parsed = policyArgs.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      errorCode: "argumentos_invalidos",
      message: "Indica el código de la póliza de demostración.",
    };
  }

  const [policy] = await db
    .select({
      policyCode: demoPoliciesTable.policyCode,
      insurerName: insurersTable.name,
      demoStatus: demoPoliciesTable.demoStatus,
      isDemoData: demoPoliciesTable.isDemoData,
    })
    .from(demoPoliciesTable)
    .innerJoin(insurersTable, eq(demoPoliciesTable.insurerId, insurersTable.id))
    .where(eq(demoPoliciesTable.policyCode, parsed.data.codigo.trim()))
    .limit(1);

  if (!policy) {
    return {
      ok: false,
      errorCode: "poliza_no_encontrada",
      message: "No existe una póliza de demostración con ese código.",
    };
  }

  return {
    ok: true,
    data: {
      ...policy,
      aclaracion:
        "Información ficticia de demostración académica. No valida cobertura real ni autoriza pagos.",
    },
  };
}

async function consultarSolicitud(raw: unknown): Promise<ToolOutcome> {
  const parsed = requestArgs.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      errorCode: "argumentos_invalidos",
      message: "Indica el código de referencia de la solicitud.",
    };
  }

  const [request] = await db
    .select({
      referenceCode: serviceRequestsTable.referenceCode,
      status: serviceRequestsTable.status,
      serviceType: serviceRequestsTable.serviceType,
      requestedDate: serviceRequestsTable.requestedDate,
      createdAt: serviceRequestsTable.createdAt,
    })
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.referenceCode, parsed.data.referencia.trim().toUpperCase()))
    .limit(1);

  if (!request) {
    return {
      ok: false,
      errorCode: "solicitud_no_encontrada",
      message: "No encontré una solicitud con ese código de referencia.",
    };
  }

  return {
    ok: true,
    data: {
      ...request,
      aclaracion:
        "Una solicitud pendiente o en revisión no significa que el servicio esté confirmado.",
    },
  };
}

async function crearSolicitud(raw: unknown): Promise<ToolOutcome> {
  const parsed = createArgs.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      errorCode: "argumentos_invalidos",
      message: "Necesito el nombre, el teléfono y el servicio solicitado.",
    };
  }

  const [offering] = await db
    .select({ id: serviceOfferingsTable.id, name: serviceOfferingsTable.name })
    .from(serviceOfferingsTable)
    .where(
      and(
        eq(serviceOfferingsTable.isActive, true),
        ilike(serviceOfferingsTable.name, `%${parsed.data.servicio.trim()}%`),
      ),
    )
    .limit(1);

  if (!offering) {
    return {
      ok: false,
      errorCode: "servicio_no_encontrado",
      message: "No encontré ese servicio en el catálogo activo. ¿Puedes confirmar cuál necesitas?",
    };
  }

  let requestedDate: Date | undefined;

  if (parsed.data.fecha) {
    const parsedDate = toDate(parsed.data.fecha);

    if (!parsedDate) {
      return {
        ok: false,
        errorCode: "fecha_invalida",
        message: "La fecha indicada no es válida.",
      };
    }

    requestedDate = parsedDate;
  }

  const result = await createServiceRequestRecord({
    contactName: parsed.data.nombre,
    contactPhone: parsed.data.telefono,
    serviceOfferingId: offering.id,
    requestedDate,
    notes: parsed.data.notas,
  });

  if (!result.ok) {
    return {
      ok: false,
      errorCode: "servicio_no_disponible",
      message: "El servicio seleccionado no está disponible.",
    };
  }

  return {
    ok: true,
    data: {
      referencia: result.referenceCode,
      estado: result.status,
      servicio: offering.name,
      aclaracion:
        "La solicitud quedó registrada para revisión. El servicio aún no está confirmado.",
    },
  };
}

async function contactoSoporte(): Promise<ToolOutcome> {
  const configured = await db
    .select({
      type: contactChannelsTable.type,
      value: contactChannelsTable.value,
      label: contactChannelsTable.label,
    })
    .from(contactChannelsTable)
    .where(eq(contactChannelsTable.isActive, true));

  if (configured.length > 0) {
    return {
      ok: true,
      data: {
        canal_configurado: true,
        canales: configured,
      },
    };
  }

  const phone = process.env.SERENA_SUPPORT_PHONE?.trim();
  const email = process.env.SERENA_SUPPORT_EMAIL?.trim();

  if (!phone && !email) {
    return {
      ok: true,
      data: {
        canal_configurado: false,
        mensaje:
          "El canal de atención humana todavía no está configurado. Indica a la persona que se comunique por los medios habituales de la funeraria.",
      },
    };
  }

  return {
    ok: true,
    data: {
      canal_configurado: true,
      telefono: phone ?? null,
      correo: email ?? null,
    },
  };
}

const PUBLIC_TOOLS = new Set([
  "consultar_servicios",
  "verificar_poliza_demo",
  "crear_solicitud",
  "contacto_soporte",
]);

export function isToolAllowed(name: string, scope: AgentContext["scope"]): boolean {
  if (scope === "staff") return (AGENT_TOOL_NAMES as readonly string[]).includes(name);
  return PUBLIC_TOOLS.has(name);
}

export async function executeTool(
  name: string,
  args: unknown,
  context: AgentContext,
): Promise<ToolOutcome> {
  if (!isToolAllowed(name, context.scope)) {
    return {
      ok: false,
      errorCode: "herramienta_no_autorizada",
      message: "Esa consulta no está disponible en este canal.",
    };
  }

  switch (name) {
    case "resumen_operativo":
      return resumenOperativo();
    case "solicitudes_pendientes":
      return solicitudesPendientes();
    case "inventario_bajo":
      return inventarioBajo();
    case "consultar_servicios":
      return consultarServicios();
    case "consultar_disponibilidad":
      return consultarDisponibilidad(args);
    case "verificar_poliza_demo":
      return verificarPoliza(args);
    case "consultar_solicitud":
      return consultarSolicitud(args);
    case "crear_solicitud":
      return crearSolicitud(args);
    case "contacto_soporte":
      return contactoSoporte();
    default:
      return {
        ok: false,
        errorCode: "herramienta_desconocida",
        message: "Esa herramienta no está autorizada.",
      };
  }
}
