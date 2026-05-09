const LOCAL_HOSTS = new Set(["localhost", "0.0.0.0"]);

export function normalizeImageUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${raw.slice("ipfs://".length).replace(/^ipfs\//, "")}`;
  if (raw.startsWith("ar://")) return `https://arweave.net/${raw.slice("ar://".length)}`;
  if (raw.startsWith("data:image/")) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (
      LOCAL_HOSTS.has(host) ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function proxiedImageUrl(value?: string | null) {
  const normalized = normalizeImageUrl(value);
  if (!normalized || normalized.startsWith("data:image/")) return normalized;
  return `/api/image-proxy?url=${encodeURIComponent(normalized)}`;
}
