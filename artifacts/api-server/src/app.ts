import express, { type Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

// Archivos estáticos del frontend compilado.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(
  currentDir,
  "../../serena-frontend/dist/public",
);
const frontendIndex = path.join(frontendDist, "index.html");

if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendDist));

  // React Router: las rutas de la aplicación devuelven index.html.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/") || req.path === "/api") {
      return next();
    }

    res.sendFile(frontendIndex, (err) => {
      if (err) next(err);
    });
  });
}

export default app;
