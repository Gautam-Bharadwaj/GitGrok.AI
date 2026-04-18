/**
 * hooks/useStreamingChat.ts — Sends a question and streams tokens into the store.
 */

"use client";

import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { chatApi } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";

export function useStreamingChat() {
  const {
    activeRepoId,
    sessionId,
    isStreaming,
    streamAbort,
    addMessage,
    appendToken,
    finaliseMessage,
    setSessionId,
    setStreaming,
    setStreamAbort,
  } = useChatStore();

  const cancelStream = useCallback(() => {
    if (streamAbort) {
      streamAbort();
      setStreamAbort(null);
      setStreaming(false);
    }
  }, [streamAbort, setStreamAbort, setStreaming]);

  const sendMessage = useCallback(
    (question: string) => {
      if (!activeRepoId || isStreaming) return;

      const userMsgId = uuidv4();
      const assistantMsgId = uuidv4();

      // Add user message immediately
      addMessage({
        id: userMsgId,
        role: "user",
        content: question,
        createdAt: new Date().toISOString(),
      });

      // Placeholder streaming message
      addMessage({
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
        createdAt: new Date().toISOString(),
      });

      setStreaming(true);

      const abort = chatApi.streamAsk(
        activeRepoId,
        question,
        sessionId ?? undefined,
        // onToken
        (token) => appendToken(assistantMsgId, token),
        // onSources
        (sources) => finaliseMessage(assistantMsgId, sources),
        // onDone
        (newSessionId) => {
          setSessionId(newSessionId);
          setStreaming(false);
          setStreamAbort(null);
          finaliseMessage(assistantMsgId);
        },
        // onError
        (msg) => {
          appendToken(assistantMsgId, `\n\n⚠️ Error: ${msg}`);
          finaliseMessage(assistantMsgId);
          setStreaming(false);
          setStreamAbort(null);
        }
      );

      setStreamAbort(abort);
    },
    [
      activeRepoId,
      isStreaming,
      sessionId,
      addMessage,
      appendToken,
      finaliseMessage,
      setSessionId,
      setStreaming,
      setStreamAbort,
    ]
  );

  return { sendMessage, cancelStream, isStreaming };
}
