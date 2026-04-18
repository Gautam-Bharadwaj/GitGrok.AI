/**
 * hooks/useRepoStatus.ts — Polls /repo/status/{id} until INDEXED or FAILED.
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { repoApi, RepoStatusDetail } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";

const POLL_INTERVAL_MS = 2000;

export function useRepoStatus(repoId: string | null) {
  const setRepoStatus = useChatStore((s) => s.setRepoStatus);
  const upsertRepo = useChatStore((s) => s.upsertRepo);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      timerRef.current = setInterval(async () => {
        try {
          const detail: RepoStatusDetail = await repoApi.status(id);
          setRepoStatus(id, detail);

          // Sync minimal summary into repos list
          upsertRepo({
            repo_id: id,
            name: id,          // name will be corrected by list refresh
            url: "",
            status: detail.status,
            chunk_count: detail.chunk_count,
            indexed_at: detail.indexed_at,
          });

          if (detail.status === "INDEXED" || detail.status === "FAILED") {
            stopPolling();
          }
        } catch {
          stopPolling();
        }
      }, POLL_INTERVAL_MS);
    },
    [setRepoStatus, stopPolling, upsertRepo]
  );

  useEffect(() => {
    if (repoId) startPolling(repoId);
    return stopPolling;
  }, [repoId, startPolling, stopPolling]);

  return { startPolling, stopPolling };
}
