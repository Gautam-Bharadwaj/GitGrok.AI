/**
 * lib/api.ts — Typed API client for the GitGrok.AI backend.
 *
 * All functions throw on HTTP errors so callers can handle them uniformly.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Generic fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type RepoStatus =
  | "PENDING"
  | "PROCESSING"
  | "INDEXED"
  | "FAILED";

export interface RepoSummary {
  repo_id: string;
  name: string;
  url: string;
  status: RepoStatus;
  chunk_count: number;
  indexed_at: string | null;
}

export interface RepoStatusDetail {
  repo_id: string;
  status: RepoStatus;
  progress_percent: number;
  file_count: number;
  chunk_count: number;
  error_message: string | null;
  indexed_at: string | null;
}

export interface Source {
  file_path: string;
  start_line: number;
  end_line: number;
  name: string;
  language: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[] | null;
  tokens_used: number | null;
  created_at: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  repo_id: string;
  messages: ChatMessage[];
}

export interface BugFinding {
  severity: "CRITICAL" | "WARNING" | "INFO";
  file: string;
  line_range: string;
  description: string;
  suggestion: string;
}

export interface BugsResponse {
  repo_id: string;
  findings: BugFinding[];
}

export interface ReadmeResponse {
  repo_id: string;
  markdown: string;
}

export interface LanguageStat {
  language: string;
  count: number;
  percentage: number;
}

export interface ChunkTypeStat {
  chunk_type: string;
  count: number;
}

export interface RepoStatsResponse {
  repo_id: string;
  name: string;
  file_count: number;
  chunk_count: number;
  total_tokens: number;
  languages: LanguageStat[];
  chunk_types: ChunkTypeStat[];
  top_files: { file_path: string; chunk_count: number }[];
  avg_chunk_size: number;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileNode[];
  chunk_count: number;
  language: string;
}

// ── Repository API ─────────────────────────────────────────────────────────────

export const repoApi = {
  load: (url: string, access_token?: string) =>
    apiFetch<{ repo_id: string; status: string }>("/api/v1/repo/load", {
      method: "POST",
      body: JSON.stringify({ url, access_token }),
    }),

  list: () => apiFetch<RepoSummary[]>("/api/v1/repo/list"),

  status: (repo_id: string) =>
    apiFetch<RepoStatusDetail>(`/api/v1/repo/status/${repo_id}`),

  delete: async (repo_id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/repo/${repo_id}`, { method: "DELETE" });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to delete repository." }));
      throw new Error(error.detail ?? `HTTP ${response.status}`);
    }
  },
};

// ── Chat API ──────────────────────────────────────────────────────────────────

export const chatApi = {
  /** Non-streaming ask — returns a full JSON response. */
  ask: (repo_id: string, question: string, session_id?: string) =>
    apiFetch<{ session_id: string; answer: string; sources: Source[]; tokens_used: number }>(
      "/api/v1/chat/ask",
      {
        method: "POST",
        body: JSON.stringify({ repo_id, question, session_id, stream: false }),
      }
    ),

  /** Open a native EventSource for server-sent event streaming. */
  streamAsk: (
    repo_id: string,
    question: string,
    session_id: string | undefined,
    onToken: (token: string) => void,
    onSources: (sources: Source[]) => void,
    onDone: (session_id: string) => void,
    onError: (msg: string) => void
  ): (() => void) => {
    // SSE requires GET or a polyfill — we POST via fetch with streaming body
    const controller = new AbortController();

    fetch(`${API_BASE}/api/v1/chat/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id, question, session_id, stream: true }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) {
          throw new Error("Streaming response body is empty.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "token") onToken(event.content);
              if (event.type === "sources") onSources(event.sources);
              if (event.type === "done") onDone(event.session_id);
              if (event.type === "error") onError(event.message);
            } catch {
              /* malformed SSE line — skip */
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") onError(err.message);
      });

    return () => controller.abort();
  },

  history: (session_id: string) =>
    apiFetch<ChatHistoryResponse>(`/api/v1/chat/history/${session_id}`),
};

// ── Analysis API ──────────────────────────────────────────────────────────────

export const analysisApi = {
  bugs: (repo_id: string, file_path?: string) =>
    apiFetch<BugsResponse>("/api/v1/analysis/bugs", {
      method: "POST",
      body: JSON.stringify({ repo_id, file_path }),
    }),

  readme: (repo_id: string) =>
    apiFetch<ReadmeResponse>("/api/v1/analysis/readme", {
      method: "POST",
      body: JSON.stringify({ repo_id }),
    }),

  stats: (repo_id: string) =>
    apiFetch<RepoStatsResponse>(`/api/v1/analysis/stats/${repo_id}`),

  files: (repo_id: string) =>
    apiFetch<FileNode[]>(`/api/v1/analysis/files/${repo_id}`),
};
