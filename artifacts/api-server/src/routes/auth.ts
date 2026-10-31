import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  ChangePasswordBody,
  ChangePasswordResponse,
  CreateEmployeeBody,
  CreateEmployeeResponse,
  GetAuthSessionResponse,
  ListEmployeesResponse,
  LoginBody,
  LoginResponse,
  LogoutResponse,
  SetEmployeeActiveBody,
  SetEmployeeActiveParams,
  SetEmployeeActiveResponse,
} from "@workspace/api-zod";
import {
  authLoginAttemptsTable,
  db,
  pool,
  rolesTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import {
  createSessionToken,
  createTemporaryPassword,
  hashPassword,
  hashSessionToken,
  LOGIN_FAILURE_LIMIT,
  LOGIN_WINDOW_MS,
  loginRateLimitKeys,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  sessionCookieOptions,
  verifyPassword,
} from "../lib/auth-security";
import {
  requireAdministrator,
  requireAuth,
  requireSameOrigin,
  type SerenaAuthContext,
} from "../middlewares/auth";

const router: IRouter = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

function toAdminEmployee(user: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

function sendError(
  res: Parameters<import("express").RequestHandler>[1],
  status: number,
  message: string,
): void {
  res.status(status).json({ error: message });
}

async function isLoginRateLimited(keys: string[]): Promise<boolean> {
  const result = await pool.query<{ key_hash: string }>(
    `SELECT key_hash
       FROM auth_login_attempts
      WHERE key_hash = ANY($1::text[])
        AND blocked_until > $2
      LIMIT 1`,
    [keys, new Date()],
  );
  return (result.rowCount ?? 0) > 0;
}

async function recordFailedLogin(keys: string[]): Promise<void> {
  const now = new Date();
  const windowFloor = new Date(now.getTime() - LOGIN_WINDOW_MS);
  const blockedUntil = new Date(now.getTime() + LOGIN_WINDOW_MS);

  await pool.query(
    `INSERT INTO auth_login_attempts (
       key_hash, failure_count, window_started_at, blocked_until, updated_at
     )
     SELECT key_hash, 1, $2, NULL, $2
       FROM unnest($1::text[]) AS input(key_hash)
     ON CONFLICT (key_hash) DO UPDATE SET
       failure_count = CASE
         WHEN auth_login_attempts.window_started_at <= $3 THEN 1
         ELSE auth_login_attempts.failure_count + 1
       END,
       window_started_at = CASE
         WHEN auth_login_attempts.window_started_at <= $3 THEN $2
         ELSE auth_login_attempts.window_started_at
       END,
       blocked_until = CASE
         WHEN auth_login_attempts.window_started_at <= $3 THEN NULL
         WHEN auth_login_attempts.failure_count + 1 >= $4 THEN $5
         ELSE auth_login_attempts.blocked_until
       END,
       updated_at = $2`,
    [keys, now, windowFloor, LOGIN_FAILURE_LIMIT, blockedUntil],
  );

  await pool.query(
    "DELETE FROM auth_login_attempts WHERE updated_at < $1",
    [new Date(now.getTime() - 24 * 60 * 60 * 1000)],
  );
}

async function clearLoginAttempts(keys: string[]): Promise<void> {
  await db
    .delete(authLoginAttemptsTable)
    .where(inArray(authLoginAttemptsTable.keyHash, keys));
}

function currentAuth(req: import("express").Request): SerenaAuthContext {
  if (!req.serenaAuth) {
    throw new Error("Authenticated request context is missing.");
  }
  return req.serenaAuth;
}

router.post("/auth/login", requireSameOrigin, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "El correo o la contraseña no tienen un formato válido.");
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

  try {
    const rateKeys = loginRateLimitKeys(email, ipAddress);
    if (await isLoginRateLimited(rateKeys)) {
      sendError(
        res,
        429,
        "Se alcanzó el límite de intentos. Inténtalo de nuevo más tarde.",
      );
      return;
    }

    const [account] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        passwordHash: usersTable.passwordHash,
        role: rolesTable.id,
        isActive: usersTable.isActive,
        mustChangePassword: usersTable.mustChangePassword,
      })
      .from(usersTable)
      .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.email, email))
      .limit(1);

    const passwordIsValid = await verifyPassword(
      parsed.data.password,
      account?.passwordHash,
    );
    if (!account || !account.isActive || !passwordIsValid) {
      await recordFailedLogin(rateKeys);
      sendError(res, 401, "Correo o contraseña incorrectos.");
      return;
    }

    await clearLoginAttempts(rateKeys);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);
    const token = createSessionToken();
    await db.insert(sessionsTable).values({
      userId: account.id,
      tokenHash: hashSessionToken(token),
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
    });
    await db
      .update(usersTable)
      .set({ lastLoginAt: now })
      .where(eq(usersTable.id, account.id));

    res.cookie(SESSION_COOKIE_NAME, token, {
      ...sessionCookieOptions(),
      maxAge: SESSION_MAX_AGE_MS,
    });
    res.status(200).json(
      LoginResponse.parse({
        user: toAuthenticatedUser(account),
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }),
    );
  } catch (error) {
    req.log?.error({ err: error }, "Error al iniciar sesión");
    sendError(res, 500, "No fue posible iniciar sesión.");
  }
});

router.post("/auth/logout", requireSameOrigin, async (req, res): Promise<void> => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token === "string" && token.length >= 40 && token.length <= 128) {
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.tokenHash, hashSessionToken(token)));
  }

  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
  res.status(200).json(LogoutResponse.parse({ success: true }));
});

router.get("/auth/session", requireAuth(), (req, res): void => {
  const auth = currentAuth(req);
  res.status(200).json(
    GetAuthSessionResponse.parse({
      user: toAuthenticatedUser({
        id: auth.userId,
        email: auth.email,
        fullName: auth.fullName,
        role: auth.role,
        mustChangePassword: auth.mustChangePassword,
      }),
      createdAt: auth.createdAt.toISOString(),
      expiresAt: auth.expiresAt.toISOString(),
    }),
  );
});

router.patch(
  "/auth/password",
  requireSameOrigin,
  requireAuth({ allowPasswordChange: true }),
  async (req, res): Promise<void> => {
    const parsed = ChangePasswordBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        "La nueva contraseña debe tener al menos 12 caracteres.",
      );
      return;
    }

    const auth = currentAuth(req);
    const [account] = await db
      .select({
        id: usersTable.id,
        passwordHash: usersTable.passwordHash,
      })
      .from(usersTable)
      .where(eq(usersTable.id, auth.userId))
      .limit(1);

    if (
      !account ||
      !(await verifyPassword(parsed.data.currentPassword, account.passwordHash))
    ) {
      sendError(res, 400, "La contraseña actual no es correcta.");
      return;
    }

    if (parsed.data.currentPassword === parsed.data.newPassword) {
      sendError(res, 400, "La nueva contraseña debe ser diferente.");
      return;
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db
      .update(usersTable)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(usersTable.id, account.id));
    await db
      .delete(sessionsTable)
      .where(
        and(
          eq(sessionsTable.userId, account.id),
          ne(sessionsTable.id, auth.sessionId),
        ),
      );

    res.status(200).json(
      ChangePasswordResponse.parse({
        ...toAuthenticatedUser({
          id: auth.userId,
          email: auth.email,
          fullName: auth.fullName,
          role: auth.role,
          mustChangePassword: auth.mustChangePassword,
        }),
        mustChangePassword: false,
      }),
    );
  },
);

router.get(
  "/admin/users",
  requireAuth(),
  requireAdministrator,
  async (req, res): Promise<void> => {
    try {
      const employees = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          fullName: usersTable.fullName,
          role: rolesTable.id,
          isActive: usersTable.isActive,
          mustChangePassword: usersTable.mustChangePassword,
          createdAt: usersTable.createdAt,
          lastLoginAt: usersTable.lastLoginAt,
        })
        .from(usersTable)
        .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
        .where(eq(usersTable.roleId, "empleado"))
        .orderBy(asc(usersTable.createdAt));

      res.status(200).json(
        ListEmployeesResponse.parse({
          employees: employees.map(toAdminEmployee),
        }),
      );
    } catch (error) {
      req.log?.error({ err: error }, "Error al listar cuentas de empleados");
      sendError(res, 500, "No fue posible cargar las cuentas.");
    }
  },
);

router.post(
  "/admin/users",
  requireSameOrigin,
  requireAuth(),
  requireAdministrator,
  async (req, res): Promise<void> => {
    const parsed = CreateEmployeeBody.safeParse(req.body);
    if (!parsed.success || parsed.data.fullName.trim().length < 2) {
      sendError(res, 400, "Revisa el nombre y el correo electrónico.");
      return;
    }

    try {
      const email = parsed.data.email.trim().toLowerCase();
      const fullName = parsed.data.fullName.trim();
      const temporaryPassword = createTemporaryPassword();
      const passwordHash = await hashPassword(temporaryPassword);
      const [employee] = await db
        .insert(usersTable)
        .values({
          email,
          fullName,
          passwordHash,
          roleId: "empleado",
          isActive: true,
          mustChangePassword: true,
        })
        .onConflictDoNothing({ target: usersTable.email })
        .returning({
          id: usersTable.id,
          email: usersTable.email,
          fullName: usersTable.fullName,
          isActive: usersTable.isActive,
          mustChangePassword: usersTable.mustChangePassword,
          createdAt: usersTable.createdAt,
          lastLoginAt: usersTable.lastLoginAt,
        });

      if (!employee) {
        sendError(res, 409, "Ya existe una cuenta con ese correo.");
        return;
      }

      res.status(201).json(
        CreateEmployeeResponse.parse({
          employee: { ...toAdminEmployee({ ...employee, role: "empleado" }) },
          temporaryPassword,
        }),
      );
    } catch (error) {
      req.log?.error({ err: error }, "Error al crear cuenta de empleado");
      sendError(res, 500, "No fue posible crear la cuenta.");
    }
  },
);

router.patch(
  "/admin/users/:userId/active",
  requireSameOrigin,
  requireAuth(),
  requireAdministrator,
  async (req, res): Promise<void> => {
    const params = SetEmployeeActiveParams.safeParse({
      userId: req.params.userId,
    });
    const parsed = SetEmployeeActiveBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      sendError(res, 400, "La cuenta o el estado no son válidos.");
      return;
    }

    try {
      const [employee] = await db
        .update(usersTable)
        .set({ isActive: parsed.data.isActive })
        .where(
          and(
            eq(usersTable.id, params.data.userId),
            eq(usersTable.roleId, "empleado"),
          ),
        )
        .returning({
          id: usersTable.id,
          email: usersTable.email,
          fullName: usersTable.fullName,
          isActive: usersTable.isActive,
          mustChangePassword: usersTable.mustChangePassword,
          createdAt: usersTable.createdAt,
          lastLoginAt: usersTable.lastLoginAt,
        });

      if (!employee) {
        sendError(res, 404, "No se encontró la cuenta de empleado.");
        return;
      }

      if (!employee.isActive) {
        await db
          .delete(sessionsTable)
          .where(eq(sessionsTable.userId, employee.id));
      }

      res.status(200).json(
        SetEmployeeActiveResponse.parse({
          employee: toAdminEmployee({ ...employee, role: "empleado" }),
        }),
      );
    } catch (error) {
      req.log?.error({ err: error }, "Error al actualizar cuenta de empleado");
      sendError(res, 500, "No fue posible actualizar la cuenta.");
    }
  },
);

export default router;
