import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AgentChatBody,
  AgentChatResponse,
  ApiError,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  AgentNotConfiguredError,
  runAgent,
} from "../lib/agent/runner";

const router: IRouter = Router();

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
      { userId: actor.userId, role: actor.role },
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
