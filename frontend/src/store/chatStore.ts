/**
 * store/chatStore.ts — Zustand global state for chat sessions, repos, and UI.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  BugFinding,
  RepoStatusDetail,
  RepoSummary,
  Source,
} from "@/lib/api";

// ── State types ───────────────────────────────────────────────────────────────

export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  tokensUsed?: number;
  isStreaming?: boolean;
  createdAt: string;
}

export type SidebarTab = "repos" | "bugs" | "readme" | "files";

interface ChatState {
  // Repository
  repos: RepoSummary[];
  activeRepoId: string | null;
  repoStatus: Record<string, RepoStatusDetail>;

  // Chat
  sessionId: string | null;
  messages: UIMessage[];
  isStreaming: boolean;
  streamAbort: (() => void) | null;

  // Analysis
  bugs: BugFinding[];
  readme: string;
  bugsLoading: boolean;
  readmeLoading: boolean;

  // UI
  sidebarTab: SidebarTab;
  analysisOpen: boolean;
  selectedSource: Source | null;

  // Actions
  setRepos: (repos: RepoSummary[]) => void;
  upsertRepo: (repo: RepoSummary) => void;
  removeRepo: (id: string) => void;
  setActiveRepo: (id: string | null) => void;
  setRepoStatus: (id: string, status: RepoStatusDetail) => void;

  setSessionId: (id: string | null) => void;
  addMessage: (msg: UIMessage) => void;
  appendToken: (msgId: string, token: string) => void;
  finaliseMessage: (msgId: string, sources?: Source[], tokensUsed?: number) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
  setStreamAbort: (abort: (() => void) | null) => void;

  setBugs: (bugs: BugFinding[]) => void;
  setReadme: (md: string) => void;
  setBugsLoading: (v: boolean) => void;
  setReadmeLoading: (v: boolean) => void;

  setSidebarTab: (tab: SidebarTab) => void;
  setAnalysisOpen: (open: boolean) => void;
  setSelectedSource: (src: Source | null) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>()(
  immer((set) => ({
    repos: [],
    activeRepoId: null,
    repoStatus: {},
    sessionId: null,
    messages: [],
    isStreaming: false,
    streamAbort: null,
    bugs: [],
    readme: "",
    bugsLoading: false,
    readmeLoading: false,
    sidebarTab: "repos",
    analysisOpen: false,
    selectedSource: null,

    setRepos: (repos) => set((s) => { s.repos = repos; }),
    upsertRepo: (repo) =>
      set((s) => {
        const idx = s.repos.findIndex((r) => r.repo_id === repo.repo_id);
        if (idx >= 0) s.repos[idx] = repo;
        else s.repos.unshift(repo);
      }),
    removeRepo: (id) =>
      set((s) => { s.repos = s.repos.filter((r) => r.repo_id !== id); }),
    setActiveRepo: (id) =>
      set((s) => {
        s.activeRepoId = id;
        s.messages = [];
        s.sessionId = null;
      }),
    setRepoStatus: (id, status) =>
      set((s) => { s.repoStatus[id] = status; }),

    setSessionId: (id) => set((s) => { s.sessionId = id; }),
    addMessage: (msg) => set((s) => { s.messages.push(msg); }),
    appendToken: (msgId, token) =>
      set((s) => {
        const msg = s.messages.find((m) => m.id === msgId);
        if (msg) msg.content += token;
      }),
    finaliseMessage: (msgId, sources, tokensUsed) =>
      set((s) => {
        const msg = s.messages.find((m) => m.id === msgId);
        if (msg) {
          msg.isStreaming = false;
          if (sources) msg.sources = sources;
          if (tokensUsed) msg.tokensUsed = tokensUsed;
        }
      }),
    clearMessages: () => set((s) => { s.messages = []; s.sessionId = null; }),
    setStreaming: (v) => set((s) => { s.isStreaming = v; }),
    setStreamAbort: (abort) => set((s) => { s.streamAbort = abort as any; }),

    setBugs: (bugs) => set((s) => { s.bugs = bugs; }),
    setReadme: (md) => set((s) => { s.readme = md; }),
    setBugsLoading: (v) => set((s) => { s.bugsLoading = v; }),
    setReadmeLoading: (v) => set((s) => { s.readmeLoading = v; }),

    setSidebarTab: (tab) => set((s) => { s.sidebarTab = tab; }),
    setAnalysisOpen: (open) => set((s) => { s.analysisOpen = open; }),
    setSelectedSource: (src) => set((s) => { s.selectedSource = src; }),
  }))
);
