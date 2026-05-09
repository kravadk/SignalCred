import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const baseUrl = process.env.DEMO_BASE_URL || "http://localhost:3000";
const chromePathCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const outputDir = path.join(root, "public", "promo");
const captureDir = path.join(outputDir, "site-demo");
const htmlPath = path.join(root, "scripts", "product-demo-video.html");
const outputPath = path.join(outputDir, "signalcred-product-demo.mp4");

function findBrowser() {
  for (const candidate of chromePathCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Chrome/Edge executable not found");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeDirBestEffort(dir) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      await sleep(300 + attempt * 300);
    }
  }
}

async function getJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function waitForHttp(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
      lastError = `${res.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(750);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

async function ensureDevServer() {
  try {
    await waitForHttp(`${baseUrl}/api/health`, 4_000);
    return null;
  } catch {
    const child = spawn("npm.cmd", ["run", "dev"], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForHttp(`${baseUrl}/api/health`, 60_000);
    return child;
  }
}

async function waitForDebugging(port) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      return await getJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await sleep(300);
    }
  }
  throw new Error("Browser debugging endpoint did not become available");
}

function send(ws, method, params = {}, timeoutMs = 120_000) {
  const id = ++send.id;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error(`CDP timeout for ${method}`));
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

async function connectToBrowser(initialUrl = "about:blank") {
  const browser = findBrowser();
  const port = 9400 + Math.floor(Math.random() * 500);
  const profileDir = path.join(root, `.tmp-demo-chrome-${port}`);
  fs.rmSync(profileDir, { recursive: true, force: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const child = spawn(browser, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--autoplay-policy=no-user-gesture-required",
    "--no-first-run",
    "--no-default-browser-check",
    "--force-device-scale-factor=1",
    initialUrl,
  ], { stdio: "ignore", windowsHide: true });

  await waitForDebugging(port);
  const tabs = await getJson(`http://127.0.0.1:${port}/json/list`);
  const tab = tabs.find((item) => item.type === "page") ?? tabs[0];
  if (!tab?.webSocketDebuggerUrl) throw new Error("No debuggable tab found");

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")), { once: true });
  });

  await send(ws, "Runtime.enable");
  await send(ws, "Page.enable");
  return { child, ws, profileDir };
}

async function getDemoToken() {
  const fallback = {
    mint: "3uQHXbnctqioxZKNdY7aPXMzjDUwpXkDLumHPdWjBAGS",
    creatorWallet: "7naFFwuEJWeWwWYQUkgAWHsxYKg3KctEuUj42JdAMidP",
  };

  try {
    const trending = await getJson(`${baseUrl}/api/trending/tokens?limit=12`);
    const token = (trending.tokens || []).find((item) => item?.mint?.endsWith("BAGS")) || trending.tokens?.[0];
    if (!token?.mint) return fallback;
    const summary = await getJson(`${baseUrl}/api/tokens/${token.mint}/summary`);
    return {
      mint: token.mint,
      creatorWallet: summary?.token?.creatorWallet || token.creatorWallet || fallback.creatorWallet,
      name: token.name,
      symbol: token.symbol,
    };
  } catch {
    return fallback;
  }
}

function shotTemplates(token) {
  const mint = token.mint;
  const wallet = token.creatorWallet;
  return [
    {
      id: "01-landing",
      route: "/",
      tag: "START",
      title: "SignalCred is not just a launchpad.",
      comment: "Launch a Bags token and immediately wrap it in proof, social context, creator reputation, and USDT economics.",
      focus: [0.02, 0.08, 0.94, 0.78],
      cursor: [0.30, 0.48],
      accent: "#ff6a58",
      waitMs: 5500,
    },
    {
      id: "02-grant-status",
      route: "/grant/status",
      tag: "GRANT STATUS",
      title: "Judges can verify the system first.",
      comment: "The grant dashboard exposes indexed tokens, freshness, public APIs, ReStream readiness, and the no-fake-data policy.",
      focus: [0.02, 0.12, 0.94, 0.72],
      cursor: [0.35, 0.34],
      accent: "#69d99a",
      waitMs: 4500,
    },
    {
      id: "03-token-index",
      route: "/token",
      tag: "TRUST INDEX",
      title: "Every Bags token becomes inspectable.",
      comment: "Market data, risk labels, trust tags, links, and source-backed rows help users compare tokens before opening one.",
      focus: [0.01, 0.26, 0.96, 0.60],
      cursor: [0.16, 0.47],
      accent: "#72c7ff",
      waitMs: 6000,
    },
    {
      id: "04-token-page",
      route: `/token/${mint}`,
      tag: "BEFORE YOU BUY",
      title: "Token pages put action and proof together.",
      comment: "Buy or sell is visible early, but the page also shows evidence, fee loop, social proof, campaigns, and real explorer links.",
      focus: [0.01, 0.08, 0.96, 0.78],
      cursor: [0.78, 0.33],
      accent: "#ffb84d",
      waitMs: 7000,
    },
    {
      id: "05-passport",
      route: `/passport/${mint}`,
      tag: "TRUST PASSPORT",
      title: "The Passport is the shareable proof page.",
      comment: "Bags source, pool, creator, market, fees, claims, social proof, USDT campaign proof, score breakdown, and all external links.",
      focus: [0.01, 0.08, 0.97, 0.80],
      cursor: [0.28, 0.52],
      accent: "#00ff88",
      waitMs: 6500,
    },
    {
      id: "06-creator-profile",
      route: `/profile/${wallet}`,
      tag: "CREATOR GRAPH",
      title: "Creators build reputation across launches.",
      comment: "Creator Trust Graph aggregates launched tokens, lifetime fees, claims, campaigns, risks, and stable USDT creator economics.",
      focus: [0.01, 0.10, 0.96, 0.74],
      cursor: [0.52, 0.46],
      accent: "#b48dff",
      waitMs: 5500,
    },
    {
      id: "07-fees",
      route: "/fees",
      tag: "FEE REPUTATION",
      title: "Real fees become public reputation.",
      comment: "Lifetime fees, claimed fees, velocity baseline, USDT equivalents, proof, and risk labels separate traction from noise.",
      focus: [0.01, 0.20, 0.96, 0.62],
      cursor: [0.64, 0.50],
      accent: "#ffcc7a",
      waitMs: 5500,
    },
    {
      id: "08-square",
      route: `/square?token=${mint}`,
      tag: "SOCIAL PROOF",
      title: "Social only counts with token context.",
      comment: "Square is a token social proof layer: official updates, campaigns, milestones, and proof-ranked community activity.",
      focus: [0.01, 0.10, 0.96, 0.76],
      cursor: [0.40, 0.42],
      accent: "#ff6a84",
      waitMs: 5500,
    },
    {
      id: "09-launch",
      route: "/launch",
      tag: "BAGS LAUNCH",
      title: "Launch through Bags. Prove everything after.",
      comment: "The launch flow creates the token, then SignalCred turns it into a verified page, official post, passport, and fee loop profile.",
      focus: [0.07, 0.06, 0.86, 0.84],
      cursor: [0.66, 0.34],
      accent: "#ffffff",
      waitMs: 5500,
    },
  ];
}

async function captureScreenshots(token) {
  fs.rmSync(captureDir, { recursive: true, force: true });
  fs.mkdirSync(captureDir, { recursive: true });

  const { child, ws, profileDir } = await connectToBrowser("about:blank");
  const templates = shotTemplates(token);

  try {
    await send(ws, "Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const captured = [];
    for (const shot of templates) {
      const url = `${baseUrl}${shot.route}`;
      console.log(`Capturing ${shot.id}: ${url}`);
      await send(ws, "Page.navigate", { url });
      await sleep(shot.waitMs);
      await send(ws, "Runtime.evaluate", {
        expression: "window.scrollTo(0, 0); document.body.style.cursor = 'none';",
      });
      await sleep(500);
      const result = await send(ws, "Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const filePath = path.join(captureDir, `${shot.id}.png`);
      fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
      captured.push({
        ...shot,
        image: `data:image/png;base64,${result.data}`,
      });
    }

    const narrationPath = path.join(outputDir, "narration.wav");
    const narration = fs.existsSync(narrationPath)
      ? `window.SITE_DEMO_NARRATION = "data:audio/wav;base64,${fs.readFileSync(narrationPath).toString("base64")}";\n`
      : "";
    const assetsJs = `${narration}window.SITE_DEMO_SHOTS = ${JSON.stringify(captured, null, 2)};\n`;
    fs.writeFileSync(path.join(captureDir, "site-demo-assets.js"), assetsJs, "utf8");
    return captured;
  } finally {
    try { ws.close(); } catch {}
    child.kill();
    await removeDirBestEffort(profileDir);
  }
}

async function renderVideo() {
  const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  const { child, ws, profileDir } = await connectToBrowser(fileUrl);

  try {
    await send(ws, "Runtime.evaluate", {
      expression: "window.startDemoRecording()",
      awaitPromise: false,
      userGesture: true,
    });

    const deadline = Date.now() + 180_000;
    let status = "recording";
    while (Date.now() < deadline) {
      const result = await send(ws, "Runtime.evaluate", {
        expression: "window.__demoStatus",
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
      expression: "window.__demoMeta",
      returnByValue: true,
    });
    const countResult = await send(ws, "Runtime.evaluate", {
      expression: "window.__demoChunks.length",
      returnByValue: true,
    });
    const count = Number(countResult.result?.value ?? 0);
    if (!count) throw new Error("No video chunks recorded");

    fs.rmSync(outputPath, { force: true });
    const out = fs.createWriteStream(outputPath);
    for (let i = 0; i < count; i++) {
      const chunkResult = await send(ws, "Runtime.evaluate", {
        expression: `window.__demoChunks[${i}]`,
        returnByValue: true,
      });
      const base64 = chunkResult.result?.value;
      if (!base64) throw new Error(`Missing chunk ${i}`);
      out.write(Buffer.from(base64, "base64"));
      process.stdout.write(`\rWriting video chunk ${i + 1}/${count}   `);
    }
    await new Promise((resolve) => out.end(resolve));
    process.stdout.write("\n");

    const stat = fs.statSync(outputPath);
    return {
      outputPath,
      bytes: stat.size,
      meta: metaResult.result?.value,
    };
  } finally {
    try { ws.close(); } catch {}
    child.kill();
    await removeDirBestEffort(profileDir);
  }
}

async function main() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This Node runtime does not expose WebSocket. Use Node 22+.");
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const devServer = await ensureDevServer();

  try {
    const token = await getDemoToken();
    console.log(`Using token ${token.symbol || ""} ${token.mint}`);
    const shots = await captureScreenshots(token);
    const video = await renderVideo();
    console.log(JSON.stringify({ token, shots: shots.map((shot) => shot.route), video }, null, 2));
  } finally {
    if (devServer) devServer.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
