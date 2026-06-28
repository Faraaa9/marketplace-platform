"""Quick rerank variant: cached e5 vectors, top-K rerank with CLEAN doc text."""
import json, os, sys, time
import numpy as np
from fastembed.rerank.cross_encoder import TextCrossEncoder

HERE = os.path.dirname(os.path.abspath(__file__))
CATS = os.path.join(HERE, "categories.jsonl")
GOLDEN = os.path.join(HERE, "..", "..", "..", "data", "routing", "eval", "golden_eval_300_labeled.jsonl")
RERANK_MODEL = sys.argv[1] if len(sys.argv) > 1 else "jinaai/jina-reranker-v2-base-multilingual"
TOPK = int(sys.argv[2]) if len(sys.argv) > 2 else 10
DOC = sys.argv[3] if len(sys.argv) > 3 else "name"  # name | name_parent | embed_text

_DIA = {"ą":"a","č":"c","ę":"e","ė":"e","į":"i","š":"s","ų":"u","ū":"u","ž":"z"}
def fold(s):
    s = (s or "").strip().lower()
    return "".join(_DIA.get(c, c) for c in s)
def load_jsonl(p):
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]

cats = [c for c in load_jsonl(CATS) if c.get("depth", 0) > 0]
cat_name_folded = [fold(c["name"]) for c in cats]
def doc_for(c):
    if DOC == "name": return c["name"]
    if DOC == "name_parent":
        bc = c["embed_text"].split(". ")[-1].split(" > ")
        return f'{c["name"]} ({bc[-2]})' if len(bc) >= 2 else c["name"]
    return c["embed_text"]
cat_doc = [doc_for(c) for c in cats]
recs = [r for r in load_jsonl(GOLDEN) if r.get("labeled", True) and r.get("gold_primary_category")]
q_raw = [f"{r.get('title','')} {r.get('description','')}".strip() for r in recs]

cat_vecs = np.load(os.path.join(HERE, "cat_e5.npy")); q_vecs = np.load(os.path.join(HERE, "q_e5.npy"))
cat_vecs = cat_vecs / (np.linalg.norm(cat_vecs, axis=1, keepdims=True) + 1e-9)
q_vecs = q_vecs / (np.linalg.norm(q_vecs, axis=1, keepdims=True) + 1e-9)
dense_top = np.argsort(-(q_vecs @ cat_vecs.T), axis=1)[:, :TOPK]

t0 = time.time()
reranker = TextCrossEncoder(model_name=RERANK_MODEL)
n = len(recs); dp1 = rp1 = rr3 = 0
for i, r in enumerate(recs):
    gold = fold(r["gold_primary_category"])
    ci = dense_top[i]
    if cat_name_folded[ci[0]] == gold: dp1 += 1
    scores = np.array(list(reranker.rerank(q_raw[i], [cat_doc[j] for j in ci])))
    order = ci[np.argsort(-scores)]
    rnames = [cat_name_folded[j] for j in order]
    if rnames[0] == gold: rp1 += 1
    if gold in rnames[:3]: rr3 += 1
print(f"model={RERANK_MODEL} TOPK={TOPK} DOC={DOC}")
print(f"  dense-only p@1 {100*dp1/n:.1f}%  ->  rerank p@1 {100*rp1/n:.1f}%  recall@3 {100*rr3/n:.1f}%   ({time.time()-t0:.0f}s)")
