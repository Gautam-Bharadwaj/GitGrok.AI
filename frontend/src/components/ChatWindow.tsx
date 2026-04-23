"use client";

/**
 * components/ChatWindow.tsx — Main chat interface with auto-scroll and input bar.
 */

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/chatStore";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import MessageBubble from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDER_QUESTIONS = [
  "Explain the overall architecture of this project",
  "How does authentication flow work? Show me the relevant code",
  "Find potential security vulnerabilities in this codebase",
  "Generate a README for this repository",
  "What does the main entry point do?",
];

export default function ChatWindow() {
  const messages     = useChatStore((s) => s.messages);
  const activeRepoId = useChatStore((s) => s.activeRepoId);
  const repos        = useChatStore((s) => s.repos);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const { sendMessage, cancelStream, isStreaming } = useStreamingChat();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const activeRepo = repos.find((r) => r.repo_id === activeRepoId);

  // Auto-scroll to bottom on new tokens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || isStreaming) return;
    setInput("");
    sendMessage(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state — no repo selected
  if (!activeRepoId) {
    return (
      <div className="chat-empty gradient-bg">
        <div className="chat-empty__inner">
          <div className="chat-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
              <path d="M9 18c-4.51 2-5-2-7-2"/>
            </svg>
          </div>
          <h2>Chat with your codebase</h2>
          <p>Index a GitHub repository, then ask anything about the code — architecture, bugs, docs, and more.</p>
          <div className="chat-empty__examples">
            {PLACEHOLDER_QUESTIONS.map((q) => (
              <div key={q} className="chat-empty__example glass">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.4, flexShrink: 0}}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                {q}
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          .chat-empty {
            flex: 1; display: flex; align-items: center; justify-content: center;
            padding: 2rem; overflow-y: auto; position: relative; z-index: 1;
          }
          .chat-empty__inner { max-width: 540px; text-align: center; }
          .chat-empty__icon {
            width: 72px; height: 72px; border-radius: 20px; margin: 0 auto 1.5rem;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, var(--accent-3), var(--accent-1));
            color: #fff; box-shadow: 0 0 60px var(--accent-glow);
            animation: pulse-glow 3s ease-in-out infinite;
          }
          .chat-empty__inner h2 {
            font-size: 1.5rem; margin-bottom: 0.75rem; font-weight: 800;
            background: linear-gradient(135deg, #fff, var(--accent-2));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          }
          .chat-empty__inner p { color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 2rem; line-height: 1.6; }
          .chat-empty__examples { display: flex; flex-direction: column; gap: 6px; text-align: left; }
          .chat-empty__example {
            padding: 12px 16px; font-size: 0.82rem; color: var(--text-muted);
            cursor: default; transition: all var(--transition-fast);
            display: flex; align-items: center; gap: 10px;
          }
          .chat-empty__example:hover {
            color: var(--text-secondary);
            border-color: rgba(139,92,246,0.25);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header__info">
          <span className="chat-header__icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
              <path d="M9 18c-4.51 2-5-2-7-2"/>
            </svg>
          </span>
          <div>
            <p className="chat-header__name">{activeRepo?.name ?? activeRepoId}</p>
            <p className="chat-header__meta">
              {activeRepo?.chunk_count ?? "?"} chunks · <span className="status-dot" />INDEXED
            </p>
          </div>
        </div>
        <Button variant="secondary" style={{ fontSize: "0.78rem" }} onClick={clearMessages}>
          New chat
        </Button>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages-container">
        {messages.length === 0 && (
          <div className="chat-starter">
            <p>Ask anything about <strong>{activeRepo?.name}</strong></p>
            <div className="chat-starter__chips">
              {PLACEHOLDER_QUESTIONS.slice(0, 3).map((q) => (
                <button
                  key={q}
                  className="followup-btn"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
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
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="chat-input-bar">
        <div className="chat-input-wrap">
          <Textarea
            id="chat-input"
            ref={inputRef}
            className="chat-textarea"
            placeholder="Ask about the code…  (Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button
              id="cancel-stream-btn"
              variant="secondary"
              style={{ flexShrink: 0 }}
              onClick={cancelStream}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              </svg>
              Stop
            </Button>
          ) : (
            <Button
              id="send-message-btn"
              style={{ flexShrink: 0 }}
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Send
            </Button>
          )}
        </div>
        <p className="chat-hint">
          <span className="hint-dot" />
          {isStreaming ? "Streaming response…" : "RAG-powered · Ready"}
        </p>
      </div>

      <style jsx>{`
        .chat-window { display: flex; flex-direction: column; height: 100%; overflow: hidden; position: relative; background: var(--bg-base); }
        .chat-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(17,17,20,0.8); backdrop-filter: blur(12px); z-index: 10;
        }
        .chat-header__info { display: flex; align-items: center; gap: 12px; }
        .chat-header__icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(139,92,246,0.12); color: var(--accent-2);
          border: 1px solid rgba(139,92,246,0.15);
        }
        .chat-header__name { font-weight: 700; font-size: 0.95rem; color: var(--text-primary); }
        .chat-header__meta { font-size: 0.72rem; color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 5px; }
        .status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 8px rgba(52,211,153,0.5);
          display: inline-block;
        }
        .chat-messages { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; padding-bottom: 140px; }
        .chat-messages > * { width: 100%; max-width: 800px; }
        
        .chat-starter { text-align: center; padding: 4rem 0; color: var(--text-secondary); font-size: 1.05rem; }
        .chat-starter__chips { display: flex; flex-direction: row; gap: 10px; justify-content: center; max-width: 600px; margin: 2rem auto 0; flex-wrap: wrap; }
        .followup-btn {
          font-size: 0.82rem; padding: 10px 18px;
          background: var(--bg-elevated); font-weight: 500;
          border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border-radius: 12px; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast); text-align: left;
        }
        .followup-btn:hover { background: rgba(139,92,246,0.1); color: var(--accent-2); border-color: rgba(139,92,246,0.25); }
        
        .chat-input-bar {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 1.5rem 1rem 1rem;
          background: linear-gradient(to top, var(--bg-base) 60%, transparent);
          display: flex; flex-direction: column; align-items: center;
          pointer-events: none;
        }
        .chat-input-wrap { 
          display: flex; gap: 8px; align-items: flex-end; 
          width: 100%; max-width: 800px; 
          background: var(--bg-elevated);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 8px 8px 8px 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          pointer-events: auto;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .chat-input-wrap:focus-within { border-color: var(--accent-3); box-shadow: 0 8px 32px var(--accent-glow); }
        .chat-textarea {
          resize: none; min-height: 24px; max-height: 200px;
          overflow-y: auto; line-height: 1.5; padding-top: 8px; padding-bottom: 8px;
          background: transparent; border: none; box-shadow: none; font-size: 0.95rem;
          color: var(--text-primary);
        }
        .chat-textarea:focus { box-shadow: none; }
        .chat-hint { 
          font-size: 0.68rem; color: var(--text-muted); 
          margin-top: 10px; text-align: center; pointer-events: auto;
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .hint-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 6px rgba(52,211,153,0.4);
        }
        
        #send-message-btn, #cancel-stream-btn {
          border-radius: 14px;
          padding: 10px;
          height: 40px;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
    </div>
  );
}
