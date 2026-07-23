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

  // Supabase JWT Verification - Temporarily bypassed for debug / mock
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token || !jwtSecret) {
    (req as Request & { userId: string }).userId = "mock_user_id";
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as { sub?: string };
    if (!payload.sub) {
      (req as Request & { userId: string }).userId = "mock_user_id";
      next();
      return;
    }
    (req as Request & { userId: string }).userId = payload.sub;
    next();
  } catch (err) {
    (req as Request & { userId: string }).userId = "mock_user_id";
    next();
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
  if (!token || !jwtSecret) return "mock_user_id";
  
  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as { sub?: string };
    return payload.sub ?? "mock_user_id";
  } catch {
    return "mock_user_id";
  }
}
