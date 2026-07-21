import jwt from "jsonwebtoken";
import { createHmac } from "crypto";
import type { Request, Response, NextFunction } from "express";

const jwtSecret = process.env.SUPABASE_JWT_SECRET;

function validateTelegramInitData(initData: string): string | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");

    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    if (botToken) {
      const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
      const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
      if (expectedHash !== hash) return null;
    }

    const userRaw = params.get("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.id) return `tg_${user.id}`;
    }

    const userId = params.get("user_id");
    if (userId) return `tg_${userId}`;
  } catch {
    return null;
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const tgInitData = req.headers["x-telegram-init-data"] as string | undefined;
  if (tgInitData) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let userId: string | null;
    if (!botToken) {
      try {
        const params = new URLSearchParams(tgInitData);
        const userRaw = params.get("user");
        if (userRaw) {
          const user = JSON.parse(userRaw);
          userId = user?.id ? `tg_${user.id}` : null;
        } else {
          userId = null;
        }
      } catch {
        userId = null;
      }
    } else {
      userId = validateTelegramInitData(tgInitData);
    }

    if (userId) {
      (req as Request & { userId: string }).userId = userId;
      next();
      return;
    }
  }

  // Supabase JWT Verification
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized: Missing token" });
    return;
  }

  if (!jwtSecret) {
    res.status(500).json({ error: "Internal Server Error: Supabase JWT secret is not configured" });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as { sub?: string };
    if (!payload.sub) {
      res.status(401).json({ error: "Unauthorized: Invalid token payload" });
      return;
    }
    (req as Request & { userId: string }).userId = payload.sub;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

export function getUserId(req: Request): string | null {
  const tgInitData = req.headers["x-telegram-init-data"] as string | undefined;
  if (tgInitData) {
    const userId = validateTelegramInitData(tgInitData);
    if (userId) return userId;
  }
  
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token || !jwtSecret) return null;
  
  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
