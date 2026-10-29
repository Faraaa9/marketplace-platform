import assert from "node:assert/strict";
import { applyDecisionPolicy, rankProviderJudgments } from "../marketplace-intelligence";

assert.deepEqual(
  applyDecisionPolicy({
    hasPrimaryCategory: true,
    primaryConfidence: 0.9,
    spamProbability: 0.9,
    ambiguityProbability: 0.1,
  }).decision,
  "reject",
);

assert.deepEqual(
  applyDecisionPolicy({
    hasPrimaryCategory: true,
    primaryConfidence: 0.83,
    spamProbability: 0.08,
    ambiguityProbability: 0.2,
  }).decision,
  "auto",
);

assert.deepEqual(
  applyDecisionPolicy({
    hasPrimaryCategory: true,
    primaryConfidence: 0.72,
    spamProbability: 0.08,
    ambiguityProbability: 0.2,
  }).decision,
  "review",
);

const providers = [
  {
    id: "vilnius",
    name: "Vilniaus meistras",
    headline: null,
    description: null,
    services: null,
    location: "Vilnius",
    rating: 4.8,
    reviewCount: 30,
    categoryIds: ["plumbing"],
    categoryNames: ["Santechnika"],
  },
  {
    id: "kaunas",
    name: "Kauno meistras",
    headline: null,
    description: null,
    services: null,
    location: "Kaunas",
    rating: 5,
    reviewCount: 10,
    categoryIds: ["plumbing"],
    categoryNames: ["Santechnika"],
  },
  {
    id: "unrelated",
    name: "Nesusijęs tiekėjas",
    headline: null,
    description: null,
    services: null,
    location: "Vilnius",
    rating: 5,
    reviewCount: 50,
    categoryIds: ["painting"],
    categoryNames: ["Dažymas"],
  },
];
const ranked = rankProviderJudgments(
  providers,
  new Map([
    ["vilnius", { score: 2.5, confidence: 0.8 }],
    ["kaunas", { score: 2.5, confidence: 0.8 }],
    ["unrelated", { score: 0.4, confidence: 0.9 }],
  ]),
  "Vilnius",
);
assert.equal(ranked[0].id, "vilnius");
assert.equal(ranked[0].cityMatch, true);
assert.equal(ranked[1].cityMatch, false);
assert.equal(ranked.some((provider) => provider.id === "unrelated"), false);

console.log("TypeSafe marketplace policy tests passed");
