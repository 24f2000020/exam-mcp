// Minimal stateless MCP server (Streamable HTTP, JSON responses) with one tool.
const EMAIL = "24f2000020@ds.study.iitm.ac.in";
const TOOL = {
  name: "solve_challenge",
  description: "Returns first 16 hex chars of SHA-256(challenge:email), challenge from X-Exam-Challenge header.",
  inputSchema: { type: "object", properties: {} },
};

async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handle(msg, headers) {
  const { id, method, params } = msg;
  if (id === undefined) return null; // notification
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  switch (method) {
    case "initialize":
      return ok({
        protocolVersion: params?.protocolVersion || "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "exam-mcp", version: "1.0.0" },
      });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: [TOOL] });
    case "tools/call": {
      if (params?.name !== TOOL.name)
        return { jsonrpc: "2.0", id, error: { code: -32602, message: "Unknown tool" } };
      const challenge = headers.get("x-exam-challenge") || "";
      const text = (await sha256hex(`${challenge}:${EMAIL}`)).slice(0, 16);
      return ok({ content: [{ type: "text", text }], isError: false });
    }
    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } };
  }
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS" };

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method !== "POST") return new Response("MCP endpoint: POST JSON-RPC", { status: 405, headers: CORS });
    let body;
    try { body = await req.json(); } catch {
      return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });
    }
    const batch = Array.isArray(body);
    const out = (await Promise.all((batch ? body : [body]).map((m) => handle(m, req.headers)))).filter(Boolean);
    if (!out.length) return new Response(null, { status: 202, headers: CORS });
    return Response.json(batch ? out : out[0], { headers: CORS });
  },
};
