"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div className="glass" style={{ maxWidth: "540px", width: "100%", padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Something went wrong</h2>
        <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
          The app hit an unexpected error. Please try again.
        </p>
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
