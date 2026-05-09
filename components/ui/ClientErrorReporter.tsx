"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

function isExtensionNoise(message: string) {
  return /evmAsk|ethereum|bis_skin_checked|ResizeObserver loop|agentation|localhost:4747/i.test(message);
}

export function ClientErrorReporter() {
  const { push } = useToast();
  const lastShownAt = useRef(0);

  useEffect(() => {
    const notify = (raw: unknown) => {
      const message = raw instanceof Error ? raw.message : String(raw ?? "");
      if (!message || isExtensionNoise(message)) return;

      const now = Date.now();
      if (now - lastShownAt.current < 4000) return;
      lastShownAt.current = now;

      push({
        kind: "error",
        text: "Something failed. No action was saved. Refresh or try again.",
      });
      console.error("[client-error]", { message: message.slice(0, 220) });
    };

    const onError = (event: ErrorEvent) => notify(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => notify(event.reason);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [push]);

  return null;
}
