/**
 * Local demo server for the prototype. Serves public/index.html and a POST /classify
 * that runs the full pipeline server-side (keeps OPENROUTER_API_KEY + DB read-only on
 * the server — never in the browser). localhost only; not for deployment.
 * ponytail: node:http, no framework — single user, single endpoint.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fold, prisma } from "./clients";
import { runFull } from "./pipeline";

const PORT = Number(process.env.PROTO_PORT || 5577);
const MODEL = process.env.PROTO_DEMO_MODEL || "google/gemini-2.5-flash";
const HTML_PATH = path.join(__dirname, "../public/index.html");

// taxonomy breadcrumb (root -> 2nd-level -> leaf) for the /branch demo, loaded once
interface Crumb { root: string | null; lvl2: string | null; leaf: string }
let crumbById: Map<string, Crumb> | null = null;
async function loadCrumbs(): Promise<Map<string, Crumb>> {
  if (crumbById) return crumbById;
  const cats = await prisma.$queryRawUnsafe<{ id: string; name: string; depth: number; parentId: string | null; rootId: string | null }[]>(
    `select id, name, depth, "parentId", "rootId" from categories`,
  );
  const byId = new Map(cats.map((c) => [c.id, c]));
  crumbById = new Map();
  for (const c of cats) {
    const lvl1Id = c.depth <= 1 ? c.id : c.parentId; // depth-1 ancestor
    crumbById.set(c.id, {
      leaf: c.name,
      lvl2: lvl1Id ? byId.get(lvl1Id)?.name ?? null : null,
      root: c.rootId ? byId.get(c.rootId)?.name ?? null : null,
    });
  }
  return crumbById;
}

const server = http.createServer((req, res) => {
  // CORS so the page works even when opened outside the server origin (preview panel / file://)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method === "GET" && req.url && req.url.startsWith("/categories")) {
    // live taxonomy name search for the manual "+ add" picker (read-only)
    const q = (new URL(req.url, "http://x").searchParams.get("q") || "").trim();
    (async () => {
      try {
        // q present -> server-side ilike (handy for direct API use); no q -> ALL names
        // (the page fetches all once and filters client-side to handle LT declensions).
        const rows = q.length >= 2
          ? await prisma.$queryRawUnsafe<{ name: string }[]>(
              `select c.name from category_embedding e join categories c on c.id = e.category_id
               where c.name ilike $1 order by length(c.name), c.name limit 8`,
              `%${q}%`,
            )
          : await prisma.$queryRawUnsafe<{ name: string }[]>(
              `select c.name from category_embedding e join categories c on c.id = e.category_id order by c.name`,
            );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows.map((r) => r.name)));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
    })();
    return;
  }
  if (req.method === "GET") {
    // serve any public/<name>.html ( / -> index ), so new pages need no new route
    const name = req.url === "/" ? "index" : (req.url || "").split("?")[0].replace(/^\//, "").replace(/\.html$/, "");
    const file = path.join(__dirname, "../public", `${name}.html`);
    if (/^[\w-]+$/.test(name) && fs.existsSync(file)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(file, "utf8"));
      return;
    }
  }
  if (req.method === "POST" && req.url === "/classify") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const text = String((JSON.parse(body || "{}") as { text?: unknown }).text || "").trim();
        if (!text) { res.writeHead(400, { "Content-Type": "application/json" }); res.end('{"error":"tuščia"}'); return; }
        const t0 = Date.now();
        const jobs = await runFull(text, { k: 50, fewshot: true, model: MODEL });
        const crumbs = await loadCrumbs();
        const out = jobs.map((j) => {
          const top1 = j.picks[0];
          const denseTop1 = j.candidates[0]?.name ?? "";
          const agree = !!top1 && fold(top1.category) === fold(denseTop1);
          const conf = top1?.confidence ?? 0;
          const verdict = !top1 ? "none" : agree ? (conf >= 0.95 ? "auto_high" : "auto") : "confirm";
          const picks = j.picks.map((p) => {
            const id = j.candidates.find((c) => fold(c.name) === fold(p.category))?.categoryId;
            const cr = id ? crumbs.get(id) : undefined;
            return { ...p, root: cr?.root ?? null, lvl2: cr?.lvl2 ?? null };
          });
          return {
            phrase: j.phrase, draft: j.draft,
            picks, denseTop1, agree, verdict,
            candidates: j.candidates.slice(0, 8).map((c) => c.name),
          };
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jobs: out, ms: Date.now() - t0, model: MODEL }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
    });
    return;
  }
  res.writeHead(404); res.end("not found");
});

server.on("close", () => prisma.$disconnect());
server.listen(PORT, () => console.log(`\n  proto demo → http://localhost:${PORT}  (modelis: ${MODEL})\n`));
