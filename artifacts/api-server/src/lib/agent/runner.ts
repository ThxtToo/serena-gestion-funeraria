import { db, agentToolLogsTable } from "@workspace/db";
import {
  AGENT_TOOL_DEFINITIONS,
  executeTool,
  type AgentContext,
} from "./tools";

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GroqToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
}

export class AgentNotConfiguredError extends Error {}

const MAX_TOOL_ROUNDS = 4;
const MAX_TOKENS = 900;

const SYSTEM_PROMPT = `Eres Serena, el asistente de una funeraria en Venezuela.
Reglas estrictas:
- Responde en español, con tono cálido, breve y respetuoso.
- Nunca inventes datos operativos: usa las herramientas y repite solo lo que devuelvan.
- Una solicitud registrada no significa servicio confirmado. Dilo con claridad cuando corresponda.
- Las pólizas son ficticias y solo sirven para la demostración académica.
- No pides más datos personales de los necesarios ni compartes datos de otras personas.
- Si no puedes resolver algo, ofrece el canal de atención humana con la herramienta contacto_soporte.
- No reveles claves, rutas internas ni detalles técnicos del sistema.`;

function groqConfig() {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) throw new AgentNotConfiguredError("GROQ_API_KEY no está configurada.");

  return {
    apiKey,
    model: process.env.GROQ_MODEL?.trim() || "qwen/qwen3.8-27b",
    baseUrl: (process.env.GROQ_BASE_URL?.trim() || "https://api.groq.com/openai/v1").replace(
      /\/$/,
      "",
    ),
  };
}

async function logToolCall(input: {
  toolName: string;
  userId: string;
  status: "ok" | "error";
  safeErrorCode?: string;
}) {
  try {
    await db.insert(agentToolLogsTable).values({
      toolName: input.toolName,
      userId: input.userId,
      status: input.status,
      safeErrorCode: input.safeErrorCode ?? null,
    });
  } catch {
    // El registro técnico no debe interrumpir la conversación.
  }
}

export async function runAgent(
  messages: AgentChatMessage[],
  context: AgentContext,
  requestCorrelationId: string,
): Promise<{ reply: string; toolsUsed: string[] }> {
  const { apiKey, model, baseUrl } = groqConfig();

  const conversation: GroqMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((message) => ({ role: message.role, content: message.content }) as GroqMessage),
  ];

  const toolsUsed: string[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    if (round === MAX_TOOL_ROUNDS) {
      return {
        reply:
          "No pude completar la consulta con la información disponible. Puedo comunicarte con el equipo humano de la funeraria.",
        toolsUsed,
      };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: conversation,
        tools: AGENT_TOOL_DEFINITIONS,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Groq respondió con estado ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: GroqMessage }>;
    };

    const message = payload.choices?.[0]?.message;

    if (!message) {
      throw new Error("La respuesta del proveedor de IA vino vacía.");
    }

    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      return {
        reply: message.content?.trim() || "No pude generar una respuesta.",
        toolsUsed,
      };
    }

    conversation.push(message);

    for (const call of toolCalls) {
      const name = call.function.name;
      let args: unknown = {};

      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }

      const outcome = await executeTool(name, args, context);
      toolsUsed.push(name);

      await logToolCall({
        toolName: name,
        userId: context.userId,
        status: outcome.ok ? "ok" : "error",
        ...(outcome.ok ? {} : { safeErrorCode: outcome.errorCode }),
      });

      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(
          outcome.ok
            ? { resultado: outcome.data }
            : { error: outcome.errorCode, mensaje: outcome.message },
        ),
      });
    }

    void requestCorrelationId;
  }

  return {
    reply: "No pude completar la consulta. Puedo comunicarte con el equipo humano.",
    toolsUsed,
  };
}
