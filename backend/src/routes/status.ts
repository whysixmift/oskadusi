import { Router, Request, Response } from "express";
import { getSystemMetrics } from "../utils/systemMetrics";
import { writeSystemLog } from "../utils/logging";

const router = Router();

// GET /api/status - Runtime metrics for monitoring.
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await getSystemMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    writeSystemLog("error", "status", "Failed to collect system metrics", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      success: false,
      error: "Failed to collect system metrics",
    });
  }
});

export default router;
