import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListMessagesQueryKey, getListChatsQueryKey } from '@workspace/api-client-react';
import { ensureSupabaseClient } from '@/lib/supabase';

export function useStreamChat(chatId: number | null, onFilesCreated?: () => void) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [lastFullContent, setLastFullContent] = useState<string | null>(null);
  const contentRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const cancelStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamStatus(null);
    setStreamContent('');
  }, []);

  const streamMessage = useCallback(async (
    content: string,
    images?: string[],
    mode?: string,
    thinkingLevel?: string,
  ) => {
    if (!chatId) return;
    const abortCtrl = new AbortController();
    abortRef.current = abortCtrl;
    setIsStreaming(true);
    setStreamContent('');
    setStreamStatus('Думаю...');
    setLastFullContent(null);
    contentRef.current = '';

    try {
      const client = await ensureSupabaseClient();
      const { data: { session } } = await client.auth.getSession();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        signal: abortCtrl.signal,
        headers,
        body: JSON.stringify({
          content,
          images: images?.length ? images : undefined,
          mode: mode || 'build',
          thinkingLevel: thinkingLevel || 'auto',
        })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;

          try {
            const event = JSON.parse(raw);

            if (event.type === 'chunk' && event.content) {
              contentRef.current += event.content;
              if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(() => {
                  setStreamContent(contentRef.current);
                  rafRef.current = null;
                });
              }
            } else if (event.type === 'status' && event.status) {
              setStreamStatus(event.status);
            } else if (event.type === 'title') {
              queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
            } else if (event.type === 'files_created') {
              onFilesCreated?.();
            } else if (event.type === 'done') {
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
              }
              setLastFullContent(contentRef.current);
              setIsStreaming(false);
              setStreamStatus(null);
              setStreamContent('');
              queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(chatId) });
              queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
            } else if (event.type === 'error') {
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
              }
              setIsStreaming(false);
              setStreamStatus(null);
              setStreamContent('');
              queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(chatId) });
              queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
            } else if (event.type === 'user_message') {
              queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(chatId) });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Stream error:', err);
      }
      setIsStreaming(false);
      setStreamStatus(null);
      setStreamContent('');
    } finally {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      abortRef.current = null;
    }
  }, [chatId, queryClient, onFilesCreated]);

  return { isStreaming, streamContent, streamStatus, streamMessage, lastFullContent, cancelStream };
}
