"""
Phase 3 Stage 1 — dense retrieval go/no-go on golden_300 (offline, no prod).

Embeds ~1942 category texts + golden queries with a local multilingual model
(fastembed/ONNX, no torch) and reports dense-only recall@K + precision@1 vs the
24.8% lexical baseline. Compares retrieved category NAME (folded, same as the TS
harness) to gold_primary_category.

Usage:
  ./phase3-venv/bin/python dense_eval.py <fastembed-model-name>
  e.g. intfloat/multilingual-e5-large   |   BAAI/bge-m3
"""
import json, sys, os, time
import numpy as np
from fastembed import TextEmbedding

HERE = os.path.dirname(os.path.abspath(__file__))
CATS = os.path.join(HERE, "categories.jsonl")
GOLDEN = os.path.join(HERE, "..", "..", "..", "data", "routing", "eval", "golden_eval_300_labeled.jsonl")

_DIA = {"ą":"a","č":"c","ę":"e","ė":"e","į":"i","š":"s","ų":"u","ū":"u","ž":"z"}
def fold(s):
    s = (s or "").strip().lower()
    return "".join(_DIA.get(c, c) for c in s)

def load_jsonl(p):
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]

def main():
    model_name = sys.argv[1] if len(sys.argv) > 1 else "intfloat/multilingual-e5-large"
    is_e5 = "e5" in model_name.lower()

    cats = [c for c in load_jsonl(CATS) if c.get("depth", 0) > 0]  # depth>0 like lexical
    cat_names_folded = [fold(c["name"]) for c in cats]
    recs = [r for r in load_jsonl(GOLDEN) if r.get("labeled", True) and r.get("gold_primary_category")]

    # e5 wants "passage: " on docs and "query: " on queries; bge-m3 wants neither.
    cat_texts = [("passage: " + c["embed_text"]) if is_e5 else c["embed_text"] for c in cats]
    q_texts = []
    for r in recs:
        q = f"{r.get('title','')} {r.get('description','')}".strip()
        q_texts.append(("query: " + q) if is_e5 else q)

    print(f"model={model_name}  cats={len(cats)}  queries={len(recs)}")
    t0 = time.time()
    emb = TextEmbedding(model_name=model_name)
    cat_vecs = np.array(list(emb.embed(cat_texts)), dtype=np.float32)
    q_vecs = np.array(list(emb.embed(q_texts)), dtype=np.float32)
    print(f"embedded in {time.time()-t0:.1f}s  dim={cat_vecs.shape[1]}")

    # cosine via normalized dot product
    cat_vecs /= (np.linalg.norm(cat_vecs, axis=1, keepdims=True) + 1e-9)
    q_vecs /= (np.linalg.norm(q_vecs, axis=1, keepdims=True) + 1e-9)
    sims = q_vecs @ cat_vecs.T  # (Q, C)

    Ks = [1, 3, 5, 10, 30]
    p1 = 0
    recall = {k: 0 for k in Ks}
    n = len(recs)
    misses = []
    for i, r in enumerate(recs):
        gold = fold(r["gold_primary_category"])
        order = np.argsort(-sims[i])[:max(Ks)]
        ranked = [cat_names_folded[j] for j in order]
        if ranked and ranked[0] == gold:
            p1 += 1
        for k in Ks:
            if gold in ranked[:k]:
                recall[k] += 1
        if (not ranked or ranked[0] != gold) and len(misses) < 6:
            top = cats[order[0]]["name"]
            misses.append(f'  "{(r.get("title") or "")[:40]}" -> {top}  | gold={r["gold_primary_category"]}')

    print(f"\n=== {model_name} ===")
    print(f"precision@1 : {p1}/{n} ({100*p1/n:.1f}%)   [lexical baseline 24.8%]")
    for k in Ks:
        print(f"recall@{k:<2}   : {recall[k]}/{n} ({100*recall[k]/n:.1f}%)")
    print("sample misses:")
    for m in misses:
        print(m)

if __name__ == "__main__":
    main()
