import { and, eq, gt } from "drizzle-orm";
import type { RequestHandler } from "express";
import {
  db,
  rolesTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import {
  hashSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_MS,
  sessionCookieOptions,
} from "../lib/auth-security";

export interface SerenaAuthContext {
  sessionId: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: Date;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      serenaAuth?: SerenaAuthContext;
    }
  }
}

function unauthenticated(res: Parameters<RequestHandler>[1]): void {
  res.status(401).json({ error: "Inicia sesión para continuar." });
}

export function requireAuth(options: {
  allowPasswordChange?: boolean;
} = {}): RequestHandler {
  return async (req, res, next): Promise<void> => {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof token !== "string" || token.length < 40 || token.length > 128) {
      res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
      unauthenticated(res);
      return;
    }

    const tokenHash = hashSessionToken(token);
    const now = new Date();
    const idleCutoff = new Date(now.getTime() - SESSION_IDLE_MS);
    const [session] = await db
      .select({
        sessionId: sessionsTable.id,
        userId: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        role: rolesTable.id,
        mustChangePassword: usersTable.mustChangePassword,
        createdAt: sessionsTable.createdAt,
        expiresAt: sessionsTable.expiresAt,
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(
        and(
          eq(sessionsTable.tokenHash, tokenHash),
          gt(sessionsTable.expiresAt, now),
          gt(sessionsTable.lastActivityAt, idleCutoff),
          eq(usersTable.isActive, true),
        ),
      )
      .limit(1);

    if (!session) {
      await db
        .delete(sessionsTable)
        .where(eq(sessionsTable.tokenHash, tokenHash));
      res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
      unauthenticated(res);
      return;
    }

    await db
      .update(sessionsTable)
      .set({ lastActivityAt: now })
      .where(eq(sessionsTable.id, session.sessionId));

    req.serenaAuth = session;

    if (session.mustChangePassword && !options.allowPasswordChange) {
      res.status(403).json({
        error: "Debes cambiar tu contraseña antes de continuar.",
      });
      return;
    }

    next();
  };
}

export const requireAdministrator: RequestHandler = (req, res, next) => {
  if (req.serenaAuth?.role !== "administrador") {
    res.status(403).json({ error: "Se requiere el rol de administrador." });
    return;
  }

  next();
};

export const requireSameOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");

  if (!origin) {
    if (fetchSite === "cross-site") {
      res.status(403).json({ error: "Solicitud de origen no permitido." });
      return;
    }
    next();
    return;
  }

  try {
    const requestOrigin = `${req.protocol}://${req.get("host")}`;
    if (new URL(origin).origin !== requestOrigin) {
      res.status(403).json({ error: "Solicitud de origen no permitido." });
      return;
    }
  } catch {
    res.status(403).json({ error: "Solicitud de origen no permitido." });
    return;
  }

  next();
};
