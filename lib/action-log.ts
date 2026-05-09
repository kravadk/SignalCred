type ActionLogStatus = "success" | "error" | "attempt";

type ActionLogInput = {
  action: string;
  type?: string;
  status: ActionLogStatus;
  wallet?: string | null;
  tokenMint?: string | null;
  postId?: string | null;
  errorType?: string | null;
  message?: string | null;
  meta?: Record<string, unknown>;
};

function short(value?: string | null) {
  if (!value) return undefined;
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-5)}` : value;
}

export function logAction(input: ActionLogInput) {
  const payload = {
    ts: new Date().toISOString(),
    action: input.action,
    type: input.type ?? "general",
    status: input.status,
    wallet: short(input.wallet),
    tokenMint: short(input.tokenMint),
    postId: short(input.postId),
    errorType: input.errorType ?? undefined,
    message: input.message ?? undefined,
    ...input.meta,
  };
  const line = `[action] ${JSON.stringify(payload)}`;
  if (input.status === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}
