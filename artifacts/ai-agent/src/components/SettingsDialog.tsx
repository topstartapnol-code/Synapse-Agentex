import { useState, useEffect } from "react";
import { X, Key, Cpu, Eye, EyeOff, Save, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetChatQueryKey, getListChatsQueryKey } from "@workspace/api-client-react";
import { ensureSupabaseClient } from "@/lib/supabase";

interface Settings {
  openrouterKey: string;
  defaultModel: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  activeChatId?: number | null;
  onModelSaved?: (model: string) => void;
}

export function SettingsDialog({ open, onClose, activeChatId, onModelSaved }: Props) {
  const [settings, setSettings] = useState<Settings>({ openrouterKey: "", defaultModel: "anthropic/claude-3.5-sonnet" });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keyStored, setKeyStored] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const client = await ensureSupabaseClient();
          const { data: { session } } = await client.auth.getSession();
          const headers: Record<string, string> = {};
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }

          const r = await fetch("/api/settings", { headers });
          if (r.ok) {
            const data: Record<string, string> = await r.json();
            const stored = data.openrouter_key === "***stored***";
            setKeyStored(stored);
            setSettings({
              openrouterKey: stored ? "" : (data.openrouter_key || ""),
              defaultModel: data.default_model || "anthropic/claude-3.5-sonnet",
            });
          }
        } catch {}
      })();
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = await ensureSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const body: Record<string, string> = { default_model: settings.defaultModel };
      if (settings.openrouterKey.trim()) {
        body.openrouter_key = settings.openrouterKey.trim();
      }
      await fetch("/api/settings", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (activeChatId) {
        await fetch(`/api/chats/${activeChatId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ model: settings.defaultModel }),
        });
        queryClient.invalidateQueries({ queryKey: getGetChatQueryKey(activeChatId) });
      }

      queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
      onModelSaved?.(settings.defaultModel);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl text-zinc-200 font-sans">

          {/* Header */}
          <div className="px-5 py-4 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                S
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Настройки</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              data-testid="button-close-settings"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                <Key size={13} className="text-zinc-400" />
                Токен OpenRouter API
              </label>
              <p className="text-[11px] text-zinc-500">
                Получи ключ на{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-zinc-300 underline hover:text-white">
                  openrouter.ai/keys
                </a>
              </p>
              {keyStored && !settings.openrouterKey && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 mb-1">
                  ✓ Токен сохранён (оставь пустым если не меняешь)
                </p>
              )}
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.openrouterKey}
                  onChange={e => { setSettings(s => ({ ...s, openrouterKey: e.target.value })); setKeyStored(false); }}
                  placeholder={keyStored && !settings.openrouterKey ? "● ● ● сохранён ● ● ●" : "sk-or-v1-..."}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 pr-9 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                  data-testid="input-openrouter-key"
                />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                <Cpu size={13} className="text-zinc-400" />
                Модель по умолчанию
              </label>
              <p className="text-[11px] text-zinc-500">
                Идентификатор модели OpenRouter (например: <span className="font-mono text-zinc-400">anthropic/claude-3.5-sonnet</span>)
              </p>
              <input
                type="text"
                value={settings.defaultModel}
                onChange={e => setSettings(s => ({ ...s, defaultModel: e.target.value }))}
                placeholder="anthropic/claude-3.5-sonnet"
                className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                data-testid="input-default-model"
              />
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {[
                  "anthropic/claude-3.5-sonnet",
                  "openai/gpt-4o",
                  "google/gemini-2.0-flash-001",
                  "deepseek/deepseek-r1",
                  "qwen/qwen3.7-flash",
                ].map(m => (
                  <button key={m} onClick={() => setSettings(s => ({ ...s, defaultModel: m }))}
                    className={`text-left px-2.5 py-1.5 rounded-md text-[11px] font-mono truncate transition-colors border ${
                      settings.defaultModel === m
                        ? "bg-zinc-800 border-zinc-600 text-zinc-100 font-medium"
                        : "bg-[#09090b] border-[#27272a] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                    }`}>
                    {m.split("/")[1]}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-zinc-200 hover:bg-white disabled:bg-zinc-800 text-zinc-900 font-medium text-xs transition-colors disabled:cursor-not-allowed"
                data-testid="button-save-settings"
              >
                {saved ? <><CheckCircle size={14} className="text-emerald-600" /> Сохранено!</>
                  : saving ? <><Save size={14} className="animate-spin" /> Сохраняем...</>
                  : <><Save size={14} /> Сохранить настройки</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
