import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const baseUrl = process.env.DEMO_BASE_URL || "http://localhost:3000";
const outputPath = path.join(root, "public", "promo", "browser-submit-qa.json");
const browserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findBrowser() {
  for (const candidate of browserCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Chrome/Edge executable not found");
}

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function waitFor(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      last = String(res.status);
    } catch (error) {
      last = error.message;
    }
    await sleep(600);
  }
  throw new Error(`Timed out waiting for ${url}: ${last}`);
}

function send(ws, method, params = {}, timeoutMs = 45_000) {
  const id = ++send.id;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error(`CDP timeout: ${method}`));
    }, timeoutMs);

    function onMessage(event) {
      const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString();
      const msg = JSON.parse(raw);
      if (msg.id !== id) return;
      clearTimeout(timeout);
      ws.removeEventListener("message", onMessage);
      if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
      else resolve(msg.result);
    }

    ws.addEventListener("message", onMessage);
  });
}
send.id = 0;

async function connect() {
  const browser = findBrowser();
  const port = 9900 + Math.floor(Math.random() * 400);
  const profileDir = path.join(root, `.tmp-submit-qa-${port}`);
  fs.rmSync(profileDir, { recursive: true, force: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const child = spawn(browser, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  await waitFor(`http://127.0.0.1:${port}/json/version`, 20_000);
  const tabs = await json(`http://127.0.0.1:${port}/json/list`);
  const tab = tabs.find((item) => item.type === "page") ?? tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("WebSocket failed")), { once: true });
  });

  return { child, ws, profileDir };
}

async function demoToken() {
  const fallback = {
    mint: "3uQHXbnctqioxZKNdY7aPXMzjDUwpXkDLumHPdWjBAGS",
    creatorWallet: "7naFFwuEJWeWwWYQUkgAWHsxYKg3KctEuUj42JdAMidP",
  };
  try {
    const trending = await json(`${baseUrl}/api/trending/tokens?limit=8`);
    const token = (trending.tokens || []).find((item) => item?.mint?.endsWith("BAGS")) || trending.tokens?.[0];
    if (!token?.mint) return fallback;
    const summary = await json(`${baseUrl}/api/tokens/${token.mint}/summary`);
    return {
      mint: token.mint,
      creatorWallet: summary?.token?.creatorWallet || token.creatorWallet || fallback.creatorWallet,
    };
  } catch {
    return fallback;
  }
}

async function main() {
  if (typeof WebSocket === "undefined") throw new Error("Node WebSocket unavailable");
  await waitFor(`${baseUrl}/api/health`, 10_000);
  const token = await demoToken();
  const routes = [
    "/",
    "/token",
    `/token/${token.mint}`,
    `/passport/${token.mint}`,
    `/profile/${token.creatorWallet}`,
    "/fees",
    `/square?token=${token.mint}`,
    "/grant/status",
    "/launch",
  ];

  const { child, ws, profileDir } = await connect();
  const errors = [];
  const results = [];
  try {
    await send(ws, "Runtime.enable");
    await send(ws, "Log.enable");
    await send(ws, "Page.enable");
    await send(ws, "Network.enable");

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString());
      if (msg.method === "Runtime.exceptionThrown") {
        const details = msg.params?.exceptionDetails;
        const text = [
          details?.text,
          details?.exception?.description,
          details?.exception?.value,
        ].filter(Boolean).join(" | ") || "Runtime exception";
        if (!/ResizeObserver loop|chrome-extension/i.test(text)) {
          errors.push({ type: "exception", text });
        }
      }
      if (msg.method === "Log.entryAdded" && ["error", "warning"].includes(msg.params?.entry?.level)) {
        const text = msg.params.entry.text || "";
        if (!/Failed to load resource|favicon|chrome-extension|Agentation|localhost:4747|bis_skin_checked/i.test(text)) {
          errors.push({ type: msg.params.entry.level, text });
        }
      }
      if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
        const text = (msg.params.args || []).map((arg) => arg.value || arg.description || "").join(" ");
        if (!/favicon|chrome-extension|Agentation|localhost:4747|bis_skin_checked/i.test(text)) {
          errors.push({ type: "console.error", text });
        }
      }
      if (msg.method === "Network.responseReceived") {
        const response = msg.params?.response;
        const url = response?.url || "";
        const status = Number(response?.status || 0);
        const isExternalImageMiss = status === 404 && /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) && !url.startsWith(baseUrl);
        if (status >= 400 && !isExternalImageMiss && !/favicon|chrome-extension|localhost:4747/i.test(url)) {
          errors.push({ type: "network", status, url });
        }
      }
    });

    const viewports = [
      { label: "desktop", width: 1920, height: 911, mobile: false },
      { label: "mobile", width: 390, height: 844, mobile: true },
    ];

    for (const viewport of viewports) {
      await send(ws, "Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      for (const route of routes) {
        const before = errors.length;
        await send(ws, "Page.navigate", { url: `${baseUrl}${route}` });
        await sleep(route === "/" ? 4500 : 3500);
        const body = await send(ws, "Runtime.evaluate", {
          expression: "document.body?.innerText?.slice(0, 3000) || ''",
          returnByValue: true,
        });
        const title = await send(ws, "Runtime.evaluate", {
          expression: "document.title",
          returnByValue: true,
        });
        const text = body.result?.value || "";
        const hasErrorShell = /Internal Server Error|Application error|Unhandled Runtime Error|Cannot find module|Failed to compile/i.test(text);
        results.push({
          viewport: viewport.label,
          route,
          title: title.result?.value || "",
          hasErrorShell,
          newErrors: errors.length - before,
        });
      }
    }
  } finally {
    try { ws.close(); } catch {}
    child.kill();
    setTimeout(() => fs.rmSync(profileDir, { recursive: true, force: true }), 500).unref?.();
  }

  const report = {
    ok: results.every((item) => !item.hasErrorShell) && errors.length === 0,
    checkedAt: new Date().toISOString(),
    baseUrl,
    token,
    results,
    errors,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
