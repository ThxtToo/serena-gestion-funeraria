import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AgentChatBody,
  AgentChatResponse,
  ApiError,
  PublicAgentChatResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  AgentNotConfiguredError,
  runAgent,
} from "../lib/agent/runner";

const router: IRouter = Router();

// Límite sencillo en memoria para el canal público: evita que un visitante
// consuma la cuota del proveedor de IA. No sustituye un límite por IP real.
const PUBLIC_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_MAX_REQUESTS = 8;
const publicUsage = new Map<string, number[]>();

function publicRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (publicUsage.get(key) ?? []).filter(
    (timestamp) => now - timestamp < PUBLIC_WINDOW_MS,
  );

  if (recent.length >= PUBLIC_MAX_REQUESTS) {
    publicUsage.set(key, recent);
    return true;
  }

  recent.push(now);
  publicUsage.set(key, recent);

  return false;
}

router.post("/agent/chat", requireAuth(), async (req, res) => {
  const parsed = AgentChatBody.safeParse(req.body);

  if (!parsed.success) {
    const error: ApiError = { error: "El mensaje no es válido." };
    res.status(400).json(error);
    return;
  }

  const actor = req.serenaAuth;

  if (!actor) {
    const error: ApiError = { error: "Inicia sesión para continuar." };
    res.status(401).json(error);
    return;
  }

  try {
    const result = await runAgent(
      parsed.data.messages,
      { userId: actor.userId, role: actor.role, scope: "staff" },
      randomUUID(),
    );

    const response = AgentChatResponse.parse({
      reply: result.reply,
      toolsUsed: result.toolsUsed,
    });

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AgentNotConfiguredError) {
      req.log?.warn("Consulta al agente sin clave de Groq configurada");

      const response: ApiError = {
        error:
          "El asistente todavía no está configurado. El equipo puede atenderte por los canales habituales.",
      };
      res.status(503).json(response);
      return;
    }

    req.log?.error({ err: error }, "Error al consultar el agente");

    const response: ApiError = {
      error:
        "No fue posible completar la consulta con el asistente. Inténtalo más tarde o pide atención humana.",
    };
    res.status(502).json(response);
  }
});

export default router;

router.post("/public/agent/chat", async (req, res) => {
  const parsed = AgentChatBody.safeParse(req.body);

  if (!parsed.success) {
    const error: ApiError = { error: "El mensaje no es válido." };
    res.status(400).json(error);
    return;
  }

  const clientKey = req.ip ?? "desconocido";

  if (publicRateLimited(clientKey)) {
    const error: ApiError = {
      error:
        "Hiciste varias consultas seguidas. Espera unos minutos o usa el formulario de solicitud.",
    };
    res.status(429).json(error);
    return;
  }

  try {
    const result = await runAgent(
      parsed.data.messages,
      { userId: null, role: "visitante", scope: "public" },
      randomUUID(),
    );

    res.status(200).json(
      PublicAgentChatResponse.parse({ reply: result.reply, toolsUsed: result.toolsUsed }),
    );
  } catch (error) {
    if (error instanceof AgentNotConfiguredError) {
      const response: ApiError = {
        error:
          "El asistente no está disponible en este momento. Puedes enviar tu solicitud desde el formulario.",
      };
      res.status(503).json(response);
      return;
    }

    req.log?.error({ err: error }, "Error en el asistente público");

    const response: ApiError = {
      error:
        "No fue posible responder ahora. Inténtalo más tarde o usa el formulario de solicitud.",
    };
    res.status(502).json(response);
  }
});
