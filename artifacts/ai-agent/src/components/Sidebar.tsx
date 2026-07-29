import { Plus, Trash2, Settings, Sun, Moon, PanelLeftClose, PanelLeftOpen, LogOut, MessageSquare, Sparkles } from "lucide-react";
import { useListChats, useCreateChat, useDeleteChat, getListChatsQueryKey, getGetChatQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { SettingsDialog } from "./SettingsDialog";
import { useState, useEffect } from "react";
import { useTheme } from "@/App";
import { useAuth } from "@/lib/auth";

export function Sidebar({ activeChatId, onSelectChat }: { activeChatId: number | null; onSelectChat: (id: number | null) => void }) {
  const { data: chats } = useListChats();
  const createChat = useCreateChat();
  const deleteChat = useDeleteChat();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [defaultModel, setDefaultModel] = useState("anthropic/claude-3.5-sonnet");
  const { theme, toggle } = useTheme();
  const { signOut, user } = useAuth();

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then((d: Record<string, string>) => {
        if (d.default_model) setDefaultModel(d.default_model);
      })
      .catch(() => {});
  }, []);

  const handleNewChat = () => {
    createChat.mutate({ data: { title: "Новый чат", model: defaultModel } }, {
      onSuccess: (chat) => {
        onSelectChat(chat.id);
        queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteChat.mutate({ id }, {
      onSuccess: () => {
        if (activeChatId === id) onSelectChat(null);
        queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
      }
    });
  };

  const handleModelSaved = () => {
    if (activeChatId) {
      queryClient.invalidateQueries({ queryKey: getGetChatQueryKey(activeChatId) });
      queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
    }
  };

  const handleSignOut = () => {
    signOut();
    queryClient.clear();
  };

  /* ── Collapsed state ── */
  if (collapsed) {
    return (
      <>
        <div
          className="synapse-sidebar-bg flex flex-col items-center py-3.5 gap-3 h-full shrink-0 backdrop-blur-xl"
          style={{ width: 56, borderRight: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex flex-col items-center gap-1 mb-1">
            <img
              src="/synapse-icon.webp"
              alt="Synapse"
              className="w-8 h-8 rounded-xl cursor-pointer hover:scale-110 hover:rotate-3 transition-all shadow-md shadow-orange-500/20"
              onClick={() => setCollapsed(false)}
              title="Открыть историю чатов"
            />
          </div>

          <button
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-xl text-muted-foreground/50 hover:text-primary hover:bg-white/10 transition-all active:scale-95"
            title="Открыть боковую панель"
          >
            <PanelLeftOpen size={16} />
          </button>

          <button
            onClick={() => { setCollapsed(false); handleNewChat(); }}
            className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-bold transition-all shadow-lg shadow-orange-500/25 active:scale-95"
            title="Новый чат"
          >
            <Plus size={16} />
          </button>

          <div className="flex-1 flex flex-col items-center gap-2 py-2 overflow-hidden">
            {chats?.slice(0, 10).map(chat => (
              <button
                key={chat.id}
                onClick={() => { onSelectChat(chat.id); setCollapsed(false); }}
                title={chat.title || "Без названия"}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  activeChatId === chat.id
                    ? "bg-gradient-to-r from-orange-400 to-amber-500 scale-150 shadow-sm shadow-orange-500"
                    : "bg-white/20 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl text-muted-foreground/50 hover:text-sidebar-foreground hover:bg-white/10 transition-all active:scale-95"
            title="Настройки"
          >
            <Settings size={15} />
          </button>
        </div>

        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          activeChatId={activeChatId}
          onModelSaved={handleModelSaved}
        />
      </>
    );
  }

  /* ── Expanded state ── */
  return (
    <>
      <div
        className="synapse-sidebar-bg flex flex-col h-full select-none text-sidebar-foreground backdrop-blur-xl"
        style={{ width: 256, borderRight: "1px solid rgba(255,255,255,0.08)", transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        {/* Header Logo */}
        <div className="px-3.5 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/synapse-icon.webp" alt="Synapse" className="w-7 h-7 rounded-xl shrink-0 shadow-md shadow-orange-500/20" />
            <span className="synapse-logo-text text-sm font-extrabold tracking-wider uppercase truncate">
              SYNAPSE AGENT
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-xl text-muted-foreground/40 hover:text-foreground hover:bg-white/10 transition-all shrink-0 active:scale-95"
            title="Свернуть панель"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3.5 pb-2.5">
          <button
            onClick={handleNewChat}
            disabled={createChat.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-orange-500/20 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, hsl(25 95% 53%) 0%, hsl(35 100% 50%) 100%)",
              color: "hsl(222 47% 8%)",
            }}
            data-testid="button-new-chat"
          >
            <Plus size={16} strokeWidth={2.5} />
            Новый чат
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-1 space-y-1">
          {(!chats || chats.length === 0) && (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground/60 text-xs py-10 px-4 leading-relaxed gap-2">
              <Sparkles size={20} className="text-orange-400/50 animate-pulse" />
              <span>История чатов пуста.<br />Нажмите «Новый чат» для старта.</span>
            </div>
          )}
          {chats?.map(chat => {
            const isActive = activeChatId === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 flex flex-col gap-0.5 ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500/15 to-transparent text-white shadow-sm"
                    : "hover:bg-white/5 text-muted-foreground hover:text-sidebar-foreground"
                }`}
                style={isActive ? { borderLeft: "3px solid hsl(25 95% 53%)", backdropFilter: "blur(12px)" } : {}}
                data-testid={`chat-item-${chat.id}`}
              >
                <div className="flex items-center gap-2 pr-6">
                  <MessageSquare size={13} className={isActive ? "text-orange-400 shrink-0" : "text-muted-foreground/40 shrink-0"} />
                  <span className="font-semibold truncate text-xs tracking-wide">{chat.title || "Без названия"}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground/50 pl-5">
                  <span>{format(new Date(chat.createdAt), "d MMM, HH:mm", { locale: ru })}</span>
                  <span>{chat.totalTokens.toLocaleString("ru")} тк</span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, chat.id)}
                  className="absolute right-2.5 top-3 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 transition-all p-1 rounded-md hover:bg-white/10"
                  data-testid={`button-delete-chat-${chat.id}`}
                  title="Удалить чат"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Settings & Account */}
        <div className="p-3 space-y-2 border-t border-white/5 bg-black/20">
          {user && (
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shrink-0 text-xs text-slate-950 font-bold shadow-md shadow-orange-500/20">
                {(user.email?.[0] || "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate text-white">
                  {user.email?.split("@")[0] || "Пользователь"}
                </div>
                <div className="text-[10px] text-muted-foreground/50 truncate">
                  {user.email}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl overflow-hidden backdrop-blur-md" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-muted-foreground/80 hover:text-white hover:bg-white/5 transition-all text-left"
              data-testid="button-open-settings"
            >
              <Settings size={14} className="shrink-0 text-orange-400" />
              <span className="text-xs font-semibold">Настройки</span>
            </button>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
            <button
              onClick={toggle}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-muted-foreground/80 hover:text-white hover:bg-white/5 transition-all text-left"
              data-testid="button-toggle-theme"
            >
              {theme === "dark"
                ? <><Sun size={14} className="shrink-0 text-amber-400" /><span className="text-xs font-semibold">Светлая тема</span></>
                : <><Moon size={14} className="shrink-0 text-blue-400" /><span className="text-xs font-semibold">Тёмная тема</span></>
              }
            </button>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-muted-foreground/80 hover:text-red-400 hover:bg-white/5 transition-all text-left"
              data-testid="button-sign-out"
            >
              <LogOut size={14} className="shrink-0" />
              <span className="text-xs font-semibold">Выйти</span>
            </button>
          </div>
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activeChatId={activeChatId}
        onModelSaved={handleModelSaved}
      />
    </>
  );
}

