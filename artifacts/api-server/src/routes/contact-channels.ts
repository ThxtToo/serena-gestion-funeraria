import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  ApiError,

  ContactChannelResponse,
  CreateContactChannelBody,
  CreateContactChannelResponse,
  UpdateContactChannelBody,
  UpdateContactChannelParams,
  UpdateContactChannelResponse,
  ListContactChannelsResponse,
} from "@workspace/api-zod";
import { contactChannelsTable, db } from "@workspace/db";
import { requireAdministrator, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

export const channelColumns = {
  id: contactChannelsTable.id,
  type: contactChannelsTable.type,
  value: contactChannelsTable.value,
  label: contactChannelsTable.label,
  isActive: contactChannelsTable.isActive,
};

router.get("/admin/contact-channels", requireAuth(), async (req, res) => {
  try {
    const channels = await db
      .select(channelColumns)
      .from(contactChannelsTable)
      .orderBy(asc(contactChannelsTable.type));

    res.status(200).json(ListContactChannelsResponse.parse({ channels }));
  } catch (error) {
    req.log?.error({ err: error }, "Error al listar canales");
    const response: ApiError = { error: "No fue posible obtener los canales." };
    res.status(500).json(response);
  }
});

router.post(
  "/admin/contact-channels",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const parsed = CreateContactChannelBody.safeParse(req.body);

    if (!parsed.success) {
      const error: ApiError = { error: "Los datos del canal no son válidos." };
      res.status(400).json(error);
      return;
    }

    try {
      const [created] = await db
        .insert(contactChannelsTable)
        .values({
          type: parsed.data.type,
          value: parsed.data.value.trim(),
          label: parsed.data.label?.trim() || null,
        })
        .returning(channelColumns);

      res.status(201).json(CreateContactChannelResponse.parse({ channel: created }));
    } catch (error) {
      req.log?.error({ err: error }, "Error al crear canal");
      const response: ApiError = { error: "No fue posible crear el canal." };
      res.status(500).json(response);
    }
  },
);

router.patch(
  "/admin/contact-channels/:channelId",
  requireAuth(),
  requireAdministrator,
  async (req, res) => {
    const params = UpdateContactChannelParams.safeParse(req.params);
    const body = UpdateContactChannelBody.safeParse(req.body);

    if (!params.success || !body.success) {
      const error: ApiError = { error: "Los datos enviados no son válidos." };
      res.status(400).json(error);
      return;
    }

    if (Object.keys(body.data).length === 0) {
      const error: ApiError = { error: "Indica al menos un campo." };
      res.status(400).json(error);
      return;
    }

    try {
      const [updated] = await db
        .update(contactChannelsTable)
        .set({
          ...(body.data.value !== undefined ? { value: body.data.value.trim() } : {}),
          ...(body.data.label !== undefined
            ? { label: body.data.label?.trim() || null }
            : {}),
          ...(body.data.isActive !== undefined ? { isActive: body.data.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(contactChannelsTable.id, params.data.channelId))
        .returning(channelColumns);

      if (!updated) {
        const error: ApiError = { error: "El canal no existe." };
        res.status(404).json(error);
        return;
      }

      res.status(200).json(UpdateContactChannelResponse.parse({ channel: updated }));
    } catch (error) {
      req.log?.error({ err: error }, "Error al actualizar canal");
      const response: ApiError = { error: "No fue posible actualizar el canal." };
      res.status(500).json(response);
    }
  },
);

export default router;
