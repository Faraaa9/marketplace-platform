import assert from "node:assert/strict";
import {
  parseDismissedCards,
  serializeDismissedCards,
} from "../dismissible-cards-shared";

const tests: Array<[string, () => void]> = [
  [
    "empty / undefined cookie parses to an empty set",
    () => {
      assert.equal(parseDismissedCards(undefined).size, 0);
      assert.equal(parseDismissedCards(null).size, 0);
      assert.equal(parseDismissedCards("").size, 0);
    },
  ],
  [
    "single id parses",
    () => {
      const ids = parseDismissedCards("provider-welcome-tip");
      assert.ok(ids.has("provider-welcome-tip"));
      assert.equal(ids.size, 1);
    },
  ],
  [
    "multiple ids split on ~",
    () => {
      const ids = parseDismissedCards("a-tip~b-tip~c-tip");
      assert.deepEqual([...ids].sort(), ["a-tip", "b-tip", "c-tip"]);
    },
  ],
  [
    "blank segments and whitespace are dropped",
    () => {
      const ids = parseDismissedCards("a-tip~~ b-tip ~");
      assert.deepEqual([...ids].sort(), ["a-tip", "b-tip"]);
    },
  ],
  [
    "serialize joins with ~ and dedupes",
    () => {
      assert.equal(
        serializeDismissedCards(["a-tip", "b-tip", "a-tip"]),
        "a-tip~b-tip",
      );
    },
  ],
  [
    "serialize drops empties",
    () => {
      assert.equal(serializeDismissedCards(["a-tip", "", "  "]), "a-tip");
    },
  ],
  [
    "round-trip: serialize(parse(x)) is stable",
    () => {
      const raw = "first-card~second-card~third-card";
      const again = serializeDismissedCards(parseDismissedCards(raw));
      assert.deepEqual(
        [...parseDismissedCards(again)].sort(),
        ["first-card", "second-card", "third-card"],
      );
    },
  ],
  [
    "adding to an existing set then serializing keeps all ids",
    () => {
      const ids = parseDismissedCards("existing-card");
      ids.add("provider-welcome-tip");
      const serialized = serializeDismissedCards(ids);
      assert.ok(parseDismissedCards(serialized).has("existing-card"));
      assert.ok(parseDismissedCards(serialized).has("provider-welcome-tip"));
    },
  ],
];

(async () => {
  for (const [name, fn] of tests) {
    fn();
    console.log(`ok - ${name}`);
  }
  console.log("RESULT: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
