require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
import fs from "node:fs";
import path from "node:path";
async function main(){
  const { prisma } = await import("../src/lib/prisma");
  const { SERVICE_CATEGORY_WHERE } = await import("../src/lib/service-categories");
  const rows = await prisma.category.findMany({
    where: SERVICE_CATEGORY_WHERE,
    select: { id:true, name:true, slug:true, depth:true, parentId:true,
      aliases: { select: { aliasName: true } } },
    orderBy: [{ depth: "asc" }, { sortOrder: "asc" }],
  });
  const byId = new Map(rows.map(r=>[r.id, r]));
  function breadcrumb(r: typeof rows[number]): string[] {
    const out:string[]=[]; let cur: typeof rows[number]|undefined=r;
    while(cur){ out.unshift(cur.name); cur = cur.parentId? byId.get(cur.parentId): undefined; }
    return out;
  }
  const out = rows.map(r=>{
    const bc = breadcrumb(r);
    const aliases = r.aliases.map(a=>a.aliasName).filter(Boolean);
    return { slug:r.slug, name:r.name, depth:r.depth??0,
      // embed text: leaf name carries most signal; aliases + breadcrumb add context
      embed_text: [r.name, aliases.join(", "), bc.join(" > ")].filter(Boolean).join(". ") };
  });
  const p = path.join(__dirname, "..", "spike-data", "categories.jsonl");
  fs.writeFileSync(p, out.map(o=>JSON.stringify(o)).join("\n")+"\n");
  console.log(`wrote ${out.length} categories -> ${p}`);
  console.log("sample:", JSON.stringify(out[5]));
  await prisma.$disconnect();
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
