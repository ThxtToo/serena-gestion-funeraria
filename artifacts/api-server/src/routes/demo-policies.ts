import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  ApiError,
  GetDemoPolicyParams,
  GetDemoPolicyResponse,
} from "@workspace/api-zod";
import { db, demoPoliciesTable, insurersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const DEMO_NOTICE =
  "Información ficticia de demostración académica. No valida cobertura real ni autoriza pagos.";

router.get("/admin/demo-policies/:policyCode", requireAuth(), async (req, res) => {
  const parsed = GetDemoPolicyParams.safeParse(req.params);

  if (!parsed.success) {
    const error: ApiError = { error: "El código de póliza no es válido." };
    res.status(400).json(error);
    return;
  }

  try {
    const [policy] = await db
      .select({
        policyCode: demoPoliciesTable.policyCode,
        insurerName: insurersTable.name,
        demoStatus: demoPoliciesTable.demoStatus,
        isDemoData: demoPoliciesTable.isDemoData,
      })
      .from(demoPoliciesTable)
      .innerJoin(insurersTable, eq(demoPoliciesTable.insurerId, insurersTable.id))
      .where(eq(demoPoliciesTable.policyCode, parsed.data.policyCode.trim()))
      .limit(1);

    if (!policy) {
      const error: ApiError = {
        error: "No existe una póliza de demostración con ese código.",
      };
      res.status(404).json(error);
      return;
    }

    const response = GetDemoPolicyResponse.parse({
      policy: { ...policy, notice: DEMO_NOTICE },
    });

    res.status(200).json(response);
  } catch (error) {
    req.log?.error({ err: error }, "Error al consultar póliza de demostración");

    const response: ApiError = {
      error: "No fue posible consultar la póliza.",
    };
    res.status(500).json(response);
  }
});

export default router;
