/**
 * Submission documentation guard.
 *
 * This is intentionally lightweight and repo-local: it catches stale branding,
 * missing grant-level surfaces, and an incomplete SignalCred checklist before submit.
 */

const fs = require("node:fs");

const checklistPath = "docs/SIGNALCRED_HACKATHON_CHECKLIST.md";
const readmePath = "README.md";
const submissionPath = "HACKATHON_SUBMISSION.md";
const restreamPath = "docs/RESTREAM_WORKER_DEPLOY.md";
const feeCronPath = "docs/FEE_SNAPSHOT_CRON.md";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function fail(message: string) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

const checklist = read(checklistPath);
const readme = read(readmePath);
const submission = read(submissionPath);
const restream = read(restreamPath);
const feeCron = read(feeCronPath);

const requiredChecklistPhrases = [
  "SignalCred",
  "Bags Trust Passport",
  "Creator Trust Graph",
  "Fee Loop Evidence",
  "USDT Creator Treasury",
  "Public Trust API",
  "/grant/status",
];

for (const phrase of requiredChecklistPhrases) {
  if (!checklist.includes(phrase)) fail(`${checklistPath} missing ${phrase}`);
}

for (let i = 1; i <= 34; i++) {
  if (!checklist.includes(`# ${i}.`)) fail(`${checklistPath} missing section ${i}`);
}

const activeDocs = [
  [checklistPath, checklist],
  [readmePath, readme],
  [submissionPath, submission],
  [restreamPath, restream],
  [feeCronPath, feeCron],
];

for (const [path, body] of activeDocs) {
  if (body.includes("BagsPulse")) fail(`${path} still contains BagsPulse`);
}

const requiredSubmissionPhrases = [
  "trust and reputation layer for Bags tokens",
  "Bags Trust Passport",
  "Creator Trust Graph",
  "Fee Loop Evidence",
  "USDT Creator Treasury",
  "Public Trust API",
  "no-fake-data",
  "AUTOMATION_SECRET",
  "RESTREAM_INGEST_SECRET",
];

const combined = `${readme}\n${submission}\n${restream}\n${feeCron}`;
for (const phrase of requiredSubmissionPhrases) {
  if (!combined.includes(phrase)) fail(`submission docs missing ${phrase}`);
}

if (!process.exitCode) {
  console.log("OK submission docs are SignalCred-ready");
}
