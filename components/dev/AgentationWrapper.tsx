"use client";

import { Agentation } from "agentation";
import { useEffect, useMemo, useState } from "react";

const SESSION_KEY = "signalcred.agentation.session";

function getEndpoint() {
  return process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT || "http://localhost:4747";
}

export function AgentationWrapper() {
  const [mounted, setMounted] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [endpointReady, setEndpointReady] = useState(false);
  const endpoint = useMemo(getEndpoint, []);

  useEffect(() => {
    setMounted(true);
    setSessionId(window.localStorage.getItem(SESSION_KEY) || undefined);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    async function checkHealth() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 900);
      try {
        const res = await fetch(`${endpoint}/health`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!cancelled) setEndpointReady(res.ok);
      } catch {
        if (!cancelled) setEndpointReady(false);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    checkHealth();
    const interval = window.setInterval(checkHealth, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [endpoint, mounted]);

  if (process.env.NODE_ENV !== "development") return null;
  if (process.env.NEXT_PUBLIC_ENABLE_AGENTATION !== "true") return null;
  if (!mounted) return null;

  return (
    <Agentation
      endpoint={endpointReady ? endpoint : undefined}
      sessionId={endpointReady ? sessionId : undefined}
      onSessionCreated={(nextSessionId) => {
        window.localStorage.setItem(SESSION_KEY, nextSessionId);
        setSessionId(nextSessionId);
        console.info("[Agentation] Session started:", nextSessionId);
      }}
    />
  );
}
