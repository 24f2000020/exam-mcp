// Self-check: node check.mjs
import w from "./worker.js";
import { createHash } from "node:crypto";
const call = async (body, h = {}) => {
  const r = await w.fetch(new Request("https://x/", { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify(body) }));
  return r.status === 202 ? 202 : r.json();
};
const ch = "0123456789abcdef0123456789abcdef";
console.log((await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })).result.serverInfo);
console.assert((await call({ jsonrpc: "2.0", method: "notifications/initialized" })) === 202);
console.assert((await call({ jsonrpc: "2.0", id: 2, method: "tools/list" })).result.tools[0].name === "solve_challenge");
const r = await call({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "solve_challenge", arguments: {} } }, { "X-Exam-Challenge": ch });
const want = createHash("sha256").update(`${ch}:24f2000020@ds.study.iitm.ac.in`).digest("hex").slice(0, 16);
console.assert(r.result.content[0].text === want, "hash mismatch");
console.log("ok", r.result.content[0].text);
