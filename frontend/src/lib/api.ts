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

export const DEMO_REPO_ID = "demo-repo";

export const chatApi = {
  /** Non-streaming ask — returns a full JSON response. */
  ask: async (repo_id: string, question: string, session_id?: string) => {
    if (repo_id === DEMO_REPO_ID) {
      return { session_id: "demo-session", answer: "Demo mode response.", sources: [], tokens_used: 10 };
    }
    return apiFetch<{ session_id: string; answer: string; sources: Source[]; tokens_used: number }>(
      "/api/v1/chat/ask",
      {
        method: "POST",
        body: JSON.stringify({ repo_id, question, session_id, stream: false }),
      }
    );
  },

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
    if (repo_id === DEMO_REPO_ID) {
      let aborted = false;
      setTimeout(() => {
        if (aborted) return;
        
        let fakeAnswer = "Express is a fast, unopinionated, minimalist web framework for Node.js. Since you are in Demo Mode, this is a simulated response to showcase the UI.";
        const q = question.toLowerCase();
        
        if (q.includes("bug") || q.includes("security") || q.includes("issue")) {
          fakeAnswer = "Based on a scan of the repository, I found 2 potential issues: \n\n1. **Critical**: Possible middleware bypass in `lib/router/index.js` (L112).\n2. **Warning**: Performance degradation in `lib/application.js` due to deprecated prototype methods.\n\nWould you like me to explain the fix for the critical issue?";
        } else if (q.includes("architecture") || q.includes("how it works")) {
          fakeAnswer = "The Express architecture follows a **middleware-based** pattern. The core logic resides in `lib/application.js`, which manages the settings and the routing system. Requests flow through a stack of functions (the 'pipeline') until a response is sent. The `Router` (in `lib/router/index.js`) handles the complex matching of URLs to specific handlers.";
        } else if (q.includes("readme") || q.includes("install")) {
          fakeAnswer = "# Express.js\n\nTo install the dependencies and start the demo server, run:\n\n```bash\n$ npm install\n$ npm start\n```\n\nYou can then access the application at `http://localhost:3000`.";
        }

        const words = fakeAnswer.split(" ");
        let i = 0;
        const interval = setInterval(() => {
          if (aborted) {
            clearInterval(interval);
            return;
          }
          if (i < words.length) {
            onToken(words[i] + (i === words.length - 1 ? "" : " "));
            i++;
          } else {
            clearInterval(interval);
            onSources([
              { file_path: "lib/express.js", start_line: 42, end_line: 55, name: "createApplication", language: "javascript", snippet: "function createApplication() {\n  var app = function(req, res, next) {\n    app.handle(req, res, next);\n  };\n  return app;\n}" }
            ]);
            onDone("demo-session");
          }
        }, 30);
      }, 400);
      return () => { aborted = true; };
    }

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
  bugs: async (repo_id: string, file_path?: string) => {
    if (repo_id === DEMO_REPO_ID) {
      return new Promise<BugsResponse>((resolve) => setTimeout(() => resolve({
        repo_id,
        findings: [
          { severity: "CRITICAL", file: "lib/router/index.js", line_range: "112-115", description: "Potential middleware bypass if next() is called with an error but no error handler is registered.", suggestion: "Ensure default error handler catches unhandled middleware exceptions." },
          { severity: "WARNING", file: "lib/application.js", line_range: "45", description: "Use of deprecated Object.setPrototypeOf can degrade performance.", suggestion: "Refactor prototype chaining." }
        ]
      }), 1200));
    }
    return apiFetch<BugsResponse>("/api/v1/analysis/bugs", {
      method: "POST",
      body: JSON.stringify({ repo_id, file_path }),
    });
  },

  readme: async (repo_id: string) => {
    if (repo_id === DEMO_REPO_ID) {
      return new Promise<ReadmeResponse>((resolve) => setTimeout(() => resolve({
        repo_id,
        markdown: "# Express.js (Demo)\n\nFast, unopinionated, minimalist web framework for [Node.js](http://nodejs.org).\n\n## Installation\n\nThis is a [Node.js](https://nodejs.org/en/) module available through the\n[npm registry](https://www.npmjs.com/).\n\nBefore installing, [download and install Node.js](https://nodejs.org/en/download/).\nNode.js 0.10 or higher is required.\n\nInstallation is done using the\n[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):\n\n```bash\n$ npm install express\n```\n\nFollow [our installing guide](http://expressjs.com/en/starter/installing.html)\nfor more information.\n\n## Features\n\n* Robust routing\n* Focus on high performance\n* Super-high test coverage\n* HTTP helpers (redirection, caching, etc)\n* View system supporting 14+ template engines\n* Content negotiation\n* Executable for generating applications quickly\n\n## Quick Start\n\nThe quickest way to get started with express is to utilize the executable `express(1)` to generate an application as shown below:\n\nCreate the app:\n\n```bash\n$ npx express-generator /tmp/foo && cd /tmp/foo\n```\n\nInstall dependencies:\n\n```bash\n$ npm install\n```\n\nStart the server:\n\n```bash\n$ npm start\n```\n\nView the website at: http://localhost:3000\n\n## Philosophy\n\nThe Express philosophy is to provide small, robust tooling for HTTP servers, making it a great solution for single page applications, web sites, hybrids, or public HTTP APIs.\n\nExpress does not force you to use any specific ORM or template engine. With support for over 14 template engines via Consolidate.js, you can quickly craft your perfect framework.\n\n## Documentation\n\nFor more details, visit the official Express documentation at http://expressjs.com.\n\n## License\n\n[MIT](LICENSE)"
      }), 800));
    }
    return apiFetch<ReadmeResponse>("/api/v1/analysis/readme", {
      method: "POST",
      body: JSON.stringify({ repo_id }),
    });
  },

  stats: async (repo_id: string) => {
    if (repo_id === DEMO_REPO_ID) {
      return new Promise<RepoStatsResponse>((resolve) => setTimeout(() => resolve({
        repo_id, name: "expressjs/express", file_count: 42, chunk_count: 156, total_tokens: 45000,
        languages: [{language: "JavaScript", count: 40, percentage: 95}, {language: "Markdown", count: 2, percentage: 5}],
        chunk_types: [{chunk_type: "Function", count: 100}, {chunk_type: "Class", count: 15}],
        top_files: [{file_path: "lib/application.js", chunk_count: 32}, {file_path: "lib/router/index.js", chunk_count: 28}, {file_path: "lib/response.js", chunk_count: 22}],
        avg_chunk_size: 280
      }), 500));
    }
    return apiFetch<RepoStatsResponse>(`/api/v1/analysis/stats/${repo_id}`);
  },

  files: async (repo_id: string) => {
    if (repo_id === DEMO_REPO_ID) {
      return new Promise<FileNode[]>((resolve) => setTimeout(() => resolve([
        { name: "lib", path: "lib", is_dir: true, chunk_count: 150, language: "", children: [
          { name: "express.js", path: "lib/express.js", is_dir: false, chunk_count: 12, language: "JavaScript", children: [] },
          { name: "application.js", path: "lib/application.js", is_dir: false, chunk_count: 32, language: "JavaScript", children: [] }
        ]},
        { name: "package.json", path: "package.json", is_dir: false, chunk_count: 2, language: "JSON", children: [] }
      ]), 400));
    }
    return apiFetch<FileNode[]>(`/api/v1/analysis/files/${repo_id}`);
  },
  
  read: async (repo_id: string, file_path: string) => {
    if (repo_id === DEMO_REPO_ID) {
      return new Promise<{ content: string }>((resolve) => setTimeout(() => resolve({ 
        content: `/**\n * ${file_path} (Demo Mode)\n */\n\nfunction demo() {\n  console.log("This is a simulated full file content for ${file_path}");\n  // In production, this would be the actual file from your repo.\n}\n\n${"// Line ".repeat(20).split(" ").join("\n")}`
      }), 300));
    }
    return apiFetch<{ content: string }>(`/api/v1/analysis/read?repo_id=${repo_id}&file_path=${encodeURIComponent(file_path)}`);
  },
};
