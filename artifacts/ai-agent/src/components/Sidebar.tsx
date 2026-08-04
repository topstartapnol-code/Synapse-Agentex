import { Plus, Trash2, Settings, Sun, Moon, PanelLeftClose, PanelLeftOpen, LogOut, MessageSquare } from "lucide-react";
import { useListChats, useCreateChat, useDeleteChat, getListChatsQueryKey, getGetChatQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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

  const handleNewChat = async () => {
    let modelToUse = defaultModel;
    try {
      const r = await fetch("/api/settings");
      if (r.ok) {
        const d = await r.json();
        if (d.default_model) {
          modelToUse = d.default_model;
          setDefaultModel(d.default_model);
        }
      }
    } catch {}

    createChat.mutate({ data: { title: "Новый чат", model: modelToUse } }, {
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
          className="bg-sidebar flex flex-col items-center py-3 gap-3 h-full shrink-0 border-r border-sidebar-border"
          style={{ width: 48 }}
        >
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Открыть панель"
          >
            <PanelLeftOpen size={16} />
          </button>

          <button
            onClick={() => { setCollapsed(false); handleNewChat(); }}
            className="p-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground transition-colors border border-sidebar-border"
            title="Новый чат (Ctrl+N)"
          >
            <Plus size={16} />
          </button>

          <div className="flex-1 flex flex-col items-center gap-2 py-2 overflow-hidden">
            {chats?.slice(0, 10).map(chat => (
              <button
                key={chat.id}
                onClick={() => { onSelectChat(chat.id); setCollapsed(false); }}
                title={chat.title || "Без названия"}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeChatId === chat.id
                    ? "bg-primary scale-125"
                    : "bg-muted-foreground/40 hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
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

  /* ── Expanded state (Theme Adaptive) ── */
  return (
    <>
      <div
        className="bg-sidebar flex flex-col h-full select-none text-sidebar-foreground border-r border-sidebar-border transition-colors"
        style={{ width: 240 }}
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-xs font-bold text-sidebar-foreground">
              S
            </div>
            <span className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              SYNAPSE
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Свернуть"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>

        {/* Action: + New Agent */}
        <div className="px-2.5 py-1.5">
          <button
            onClick={handleNewChat}
            disabled={createChat.isPending}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-sidebar-accent/70 hover:bg-sidebar-accent text-sidebar-foreground border border-sidebar-border text-xs font-medium transition-all group"
            data-testid="button-new-chat"
          >
            <span className="flex items-center gap-2">
              <Plus size={14} className="text-muted-foreground group-hover:text-sidebar-foreground" />
              Новый чат
            </span>
            <kbd className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded font-mono border border-sidebar-border">
              Ctrl+N
            </kbd>
          </button>
        </div>

        {/* Section: History List */}
        <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-muted-foreground tracking-wide uppercase flex items-center justify-between">
          <span>Чаты</span>
          <span className="text-[10px] text-muted-foreground/60 font-mono">{chats?.length || 0}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5">
          {(!chats || chats.length === 0) && (
            <div className="text-center text-muted-foreground text-xs py-8 px-2 font-sans">
              Нет чатов
            </div>
          )}
          {chats?.map(chat => {
            const isActive = activeChatId === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group relative px-2.5 py-1.5 rounded-md cursor-pointer transition-colors flex items-center justify-between text-xs ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground font-semibold border border-sidebar-border shadow-sm"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
                data-testid={`chat-item-${chat.id}`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <MessageSquare size={13} className={isActive ? "text-sidebar-foreground shrink-0" : "text-muted-foreground/70 shrink-0"} />
                  <span className="truncate">{chat.title || "Без названия"}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-muted-foreground p-0.5 transition-opacity"
                  data-testid={`button-delete-chat-${chat.id}`}
                  title="Удалить"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer User Profile */}
        <div className="p-2 border-t border-sidebar-border bg-sidebar space-y-1">
          {user && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-sidebar-accent/50 border border-sidebar-border text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-[10px] text-sidebar-foreground font-bold shrink-0">
                  {(user.email?.[0] || "?").toUpperCase()}
                </div>
                <span className="truncate text-sidebar-foreground font-medium text-[11px]">
                  {user.email?.split("@")[0] || "User"}
                </span>
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-muted-foreground hover:text-sidebar-foreground p-1 transition-colors"
                title="Настройки"
              >
                <Settings size={13} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-2 pt-1 text-muted-foreground text-[11px]">
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 hover:text-sidebar-foreground transition-colors"
            >
              {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
              <span>{theme === "dark" ? "Светлая" : "Тёмная"}</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 hover:text-red-500 transition-colors"
            >
              <LogOut size={12} />
              <span>Выйти</span>
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
