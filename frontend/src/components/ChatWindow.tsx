"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/chatStore";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import MessageBubble from "./MessageBubble";

export default function ChatWindow() {
  const messages     = useChatStore((s) => s.messages);
  const activeRepoId = useChatStore((s) => s.activeRepoId);
  const repos        = useChatStore((s) => s.repos);

  const { sendMessage, cancelStream, isStreaming } = useStreamingChat();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const activeRepo = repos.find((r) => r.repo_id === activeRepoId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || isStreaming) return;

    if (!activeRepoId) {
      alert("Please select an indexed repository from Step 2: Library before asking a question.");
      return;
    }

    setInput("");
    sendMessage(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="chat-messages" id="chat-messages" style={{ overflowY: 'auto', height: 'calc(100% - 74px)' }}>
        {(!activeRepoId || messages.length === 0) && (
          <div className="message assistant">
            <div className="message-content">
              {activeRepoId 
                ? `Welcome to GitGrok AI. You are connected to ${activeRepo?.name}. Ask any question about the codebase.`
                : `Welcome to GitGrok AI. Please connect your GitHub repository and sync your documents to start chatting.`}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={idx === messages.length - 1}
            onFollowUp={(q) => sendMessage(q)}
          />
        ))}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      <div className="chat-input-container" style={{ position: 'absolute', bottom: 0, width: '100%', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}>
        <div className="quick-recommendations" id="recommendations-container" style={{ display: "none" }}></div>
        <div className="input-box">
          <input
            type="text"
            id="chat-input"
            ref={inputRef}
            placeholder="Ask a question..."
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button id="cancel-stream-btn" className="btn-send" onClick={cancelStream}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            </button>
          ) : (
            <button id="btn-send-message" className="btn-send" onClick={handleSend} disabled={!input.trim()}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
