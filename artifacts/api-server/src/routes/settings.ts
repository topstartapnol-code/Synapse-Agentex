import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/settings", requireAuth, async (req, res) => {
  try {
    const userId = (req as typeof req & { userId: string }).userId;
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string> = {};

    // Base defaults
    for (const row of rows) {
      if (!row.key.includes("_")) {
        result[row.key] = row.value;
      }
    }

    // User-specific overrides
    const suffix = `_${userId}`;
    for (const row of rows) {
      if (row.key.endsWith(suffix)) {
        const baseKey = row.key.slice(0, -suffix.length);
        result[baseKey] = row.value;
      }
    }

    // Mask sensitive keys
    if (result["openrouter_key"]) {
      result["openrouter_key"] = "***stored***";
    }

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.get("/settings/raw", requireAuth, async (req, res) => {
  try {
    const userId = (req as typeof req & { userId: string }).userId;
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string> = {};

    const suffix = `_${userId}`;
    for (const row of rows) {
      if (row.key.endsWith(suffix)) {
        const baseKey = row.key.slice(0, -suffix.length);
        result[baseKey] = row.value;
      }
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.post("/settings", requireAuth, async (req, res) => {
  try {
    const userId = (req as typeof req & { userId: string }).userId;
    const entries = req.body as Record<string, string>;

    for (const [key, value] of Object.entries(entries)) {
      if (typeof value !== "string") continue;
      const userKey = `${key}_${userId}`;
      const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, userKey));
      if (existing.length > 0) {
        await db.update(settingsTable)
          .set({ value, updatedAt: new Date() })
          .where(eq(settingsTable.key, userKey));
      } else {
        await db.insert(settingsTable).values({ key: userKey, value });
      }
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export default router;
