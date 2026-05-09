import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const chromePathCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findBrowser() {
  for (const candidate of chromePathCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Chrome/Edge executable not found");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function httpJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function waitForDebugging(port) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      return await httpJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await sleep(300);
    }
  }
  throw new Error("Browser debugging endpoint did not become available");
}

function send(ws, method, params = {}) {
  const id = ++send.id;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error(`CDP timeout for ${method}`));
    }, 120_000);
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

async function main() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This Node runtime does not expose WebSocket. Use Node 22+.");
  }

  const browser = findBrowser();
  const port = 9333 + Math.floor(Math.random() * 400);
  const profileDir = path.join(root, ".tmp-promo-chrome-profile");
  fs.rmSync(profileDir, { recursive: true, force: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const htmlPath = path.join(root, "scripts", "promo-video.html");
  const outputDir = path.join(root, "public", "promo");
  const outputPath = path.join(outputDir, "signalcred-promo.webm");
  fs.mkdirSync(outputDir, { recursive: true });

  const child = spawn(browser, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--headless=new",
    "--disable-gpu",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    `file:///${htmlPath.replace(/\\/g, "/")}`,
  ], { stdio: "ignore" });

  try {
    await waitForDebugging(port);
    const tabs = await httpJson(`http://127.0.0.1:${port}/json/list`);
    const tab = tabs.find((item) => item.type === "page") ?? tabs[0];
    if (!tab?.webSocketDebuggerUrl) throw new Error("No debuggable tab found");
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")), { once: true });
    });

    await send(ws, "Runtime.enable");
    await send(ws, "Page.enable");
    await send(ws, "Runtime.evaluate", {
      expression: "window.startPromoRecording()",
      awaitPromise: false,
      userGesture: true,
    });

    const deadline = Date.now() + 120_000;
    let status = "recording";
    while (Date.now() < deadline) {
      const result = await send(ws, "Runtime.evaluate", {
        expression: "window.__promoStatus",
        returnByValue: true,
      });
      status = result.result?.value;
      process.stdout.write(`\rRecording status: ${status}   `);
      if (status === "done") break;
      await sleep(1000);
    }
    process.stdout.write("\n");
    if (status !== "done") throw new Error(`Recording did not finish, status=${status}`);

    const metaResult = await send(ws, "Runtime.evaluate", {
      expression: "window.__promoMeta",
      returnByValue: true,
    });
    const countResult = await send(ws, "Runtime.evaluate", {
      expression: "window.__promoChunks.length",
      returnByValue: true,
    });
    const count = Number(countResult.result?.value ?? 0);
    if (!count) throw new Error("No video chunks recorded");

    const out = fs.createWriteStream(outputPath);
    for (let i = 0; i < count; i++) {
      const chunkResult = await send(ws, "Runtime.evaluate", {
        expression: `window.__promoChunks[${i}]`,
        returnByValue: true,
      });
      const base64 = chunkResult.result?.value;
      if (!base64) throw new Error(`Missing chunk ${i}`);
      out.write(Buffer.from(base64, "base64"));
      process.stdout.write(`\rWriting chunk ${i + 1}/${count}   `);
    }
    await new Promise((resolve) => out.end(resolve));
    process.stdout.write("\n");

    const stat = fs.statSync(outputPath);
    console.log(JSON.stringify({
      outputPath,
      bytes: stat.size,
      meta: metaResult.result?.value,
    }, null, 2));

    ws.close();
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
