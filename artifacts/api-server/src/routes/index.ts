import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatsRouter from "./chats";
import streamRouter from "./stream";
import filesRouter from "./files";
import terminalRouter from "./terminal";
import settingsRouter from "./settings";
import modelsRouter from "./models";
import botRouter from "./bot";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatsRouter);
router.use(streamRouter);
router.use(filesRouter);
router.use(terminalRouter);
router.use(settingsRouter);
router.use(modelsRouter);
router.use(botRouter);

router.get("/config", (_req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  });
});

export default router;
