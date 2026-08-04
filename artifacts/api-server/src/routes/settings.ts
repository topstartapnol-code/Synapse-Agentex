import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/settings", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const keyRow = await db.select().from(settingsTable).where(eq(settingsTable.key, `openrouter_key_${userId}`));
    const modelRow = await db.select().from(settingsTable).where(eq(settingsTable.key, `default_model_${userId}`));

    const result: Record<string, string> = {
      openrouter_key: keyRow[0]?.value ? "***stored***" : "",
      default_model: modelRow[0]?.value || "anthropic/claude-3.5-sonnet",
    };

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.get("/settings/raw", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const keyRow = await db.select().from(settingsTable).where(eq(settingsTable.key, `openrouter_key_${userId}`));
    const modelRow = await db.select().from(settingsTable).where(eq(settingsTable.key, `default_model_${userId}`));

    res.json({
      openrouter_key: keyRow[0]?.value || "",
      default_model: modelRow[0]?.value || "anthropic/claude-3.5-sonnet",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.post("/settings", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
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
