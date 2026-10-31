import { createInterface } from "node:readline/promises";
import { eq } from "drizzle-orm";
import { db, pool, rolesTable, usersTable } from "@workspace/db";
import { hashPassword } from "../lib/auth-security";
import { logger } from "../lib/logger";

async function promptHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error("Ejecuta el comando desde una terminal interactiva.");
  }

  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (error?: Error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Operación cancelada."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };

    process.stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const fullName = (await readline.question("Nombre del administrador: ")).trim();
  const email = (
    await readline.question("Correo del administrador: ")
  )
    .trim()
    .toLowerCase();
  readline.close();

  const password = await promptHidden("Contraseña inicial (mínimo 12 caracteres): ");
  if (fullName.length < 2 || fullName.length > 120) {
    throw new Error("El nombre debe tener entre 2 y 120 caracteres.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("El correo electrónico no es válido.");
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error("La contraseña debe tener entre 12 y 128 caracteres.");
  }

  await db
    .insert(rolesTable)
    .values([
      {
        id: "administrador",
        description: "Administra cuentas y operaciones autorizadas.",
      },
      {
        id: "empleado",
        description: "Gestiona operaciones de Serena según sus permisos.",
      },
    ])
    .onConflictDoNothing();

  const [existingAdmin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.roleId, "administrador"))
    .limit(1);
  if (existingAdmin) {
    throw new Error("Ya existe una cuenta administradora.");
  }

  await db.insert(usersTable).values({
    fullName,
    email,
    passwordHash: await hashPassword(password),
    roleId: "administrador",
    isActive: true,
    mustChangePassword: false,
  });

  logger.info("Cuenta administradora inicial creada.");
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, "No fue posible crear el administrador inicial");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
