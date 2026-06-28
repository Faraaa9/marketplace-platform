"""
Phase 3 Stage 2+3 — dense retrieval (e5-large) -> cross-encoder rerank
(jina-reranker-v2-multilingual) over top-30, on golden_300. Offline, no prod.

Reports reranked precision@1 / recall@3 vs dense-only and the 24.8% lexical base.
Caches e5 vectors to .npy so reruns skip the 6-min embed.
"""
import json, os, time
import numpy as np
from fastembed import TextEmbedding
from fastembed.rerank.cross_encoder import TextCrossEncoder

HERE = os.path.dirname(os.path.abspath(__file__))
CATS = os.path.join(HERE, "categories.jsonl")
GOLDEN = os.path.join(HERE, "..", "..", "..", "data", "routing", "eval", "golden_eval_300_labeled.jsonl")
EMB_MODEL = "intfloat/multilingual-e5-large"
RERANK_MODEL = "jinaai/jina-reranker-v2-base-multilingual"
TOPK = 30

_DIA = {"ą":"a","č":"c","ę":"e","ė":"e","į":"i","š":"s","ų":"u","ū":"u","ž":"z"}
def fold(s):
    s = (s or "").strip().lower()
    return "".join(_DIA.get(c, c) for c in s)

def load_jsonl(p):
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]

def main():
    cats = [c for c in load_jsonl(CATS) if c.get("depth", 0) > 0]
    cat_name_folded = [fold(c["name"]) for c in cats]
    cat_doc = [c["embed_text"] for c in cats]  # raw text for reranker
    recs = [r for r in load_jsonl(GOLDEN) if r.get("labeled", True) and r.get("gold_primary_category")]
    q_raw = [f"{r.get('title','')} {r.get('description','')}".strip() for r in recs]

    cat_npy, q_npy = os.path.join(HERE, "cat_e5.npy"), os.path.join(HERE, "q_e5.npy")
    if os.path.exists(cat_npy) and os.path.exists(q_npy):
        cat_vecs, q_vecs = np.load(cat_npy), np.load(q_npy)
        print("loaded cached e5 vectors")
    else:
        print("embedding with e5-large (one-time ~6min)...")
        t0 = time.time()
        emb = TextEmbedding(model_name=EMB_MODEL)
        cat_vecs = np.array(list(emb.embed(["passage: " + t for t in cat_doc])), dtype=np.float32)
        q_vecs = np.array(list(emb.embed(["query: " + t for t in q_raw])), dtype=np.float32)
        np.save(cat_npy, cat_vecs); np.save(q_npy, q_vecs)
        print(f"embedded + cached in {time.time()-t0:.1f}s")

    cat_vecs = cat_vecs / (np.linalg.norm(cat_vecs, axis=1, keepdims=True) + 1e-9)
    q_vecs = q_vecs / (np.linalg.norm(q_vecs, axis=1, keepdims=True) + 1e-9)
    sims = q_vecs @ cat_vecs.T
    dense_top = np.argsort(-sims, axis=1)[:, :TOPK]  # (Q, TOPK)

    print(f"reranking {len(recs)} x {TOPK} with {RERANK_MODEL}...")
    t0 = time.time()
    reranker = TextCrossEncoder(model_name=RERANK_MODEL)
    dense_p1 = dense_r3 = rr_p1 = rr_r3 = 0
    n = len(recs)
    flips = []
    for i, r in enumerate(recs):
        gold = fold(r["gold_primary_category"])
        cand_idx = dense_top[i]
        # dense-only metrics
        dnames = [cat_name_folded[j] for j in cand_idx]
        if dnames[0] == gold: dense_p1 += 1
        if gold in dnames[:3]: dense_r3 += 1
        # rerank
        docs = [cat_doc[j] for j in cand_idx]
        scores = list(reranker.rerank(q_raw[i], docs))
        order = np.argsort(-np.array(scores))
        rnames = [cat_name_folded[cand_idx[o]] for o in order]
        if rnames[0] == gold: rr_p1 += 1
        if gold in rnames[:3]: rr_r3 += 1
        if dnames[0] != gold and rnames[0] == gold and len(flips) < 6:
            flips.append(f'  "{(r.get("title") or "")[:38]}" dense#1={cats[cand_idx[0]]["name"]} -> rerank#1={cats[cand_idx[order[0]]]["name"]} (gold!)')
    dt = time.time() - t0

    print(f"\n=== Phase 3 dense+rerank on golden_300 ({n} queries) ===")
    print(f"lexical baseline      precision@1 24.8%")
    print(f"dense-only (e5-large) precision@1 {100*dense_p1/n:.1f}%   recall@3 {100*dense_r3/n:.1f}%")
    print(f"dense + jina rerank   precision@1 {100*rr_p1/n:.1f}%   recall@3 {100*rr_r3/n:.1f}%")
    print(f"rerank time {dt:.0f}s ({1000*dt/n:.0f}ms/query for {TOPK} cands)")
    print("sample rerank rescues (dense#1 wrong -> rerank#1 correct):")
    for f in flips:
        print(f)

if __name__ == "__main__":
    main()
