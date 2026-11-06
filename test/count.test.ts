import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Json, Storage } from "@tessello/sdk";
import { increment, readCount, reset } from "../src/lib/count.ts";

/** The Host storage of the Module, in memory. */
function memoryStorage(initial: Record<string, Json> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => void values.set(key, structuredClone(value)),
    delete: async (key) => void values.delete(key),
    keys: async () => [...values.keys()],
  };
}

describe("the count in the Host storage", () => {
  test("a count never written is 0", async () => {
    assert.equal(await readCount(memoryStorage()), 0);
  });

  test("a value that is not a whole number is read as 0", async () => {
    assert.equal(await readCount(memoryStorage({ count: "three" })), 0);
  });

  test("adding one writes the new count and returns it", async () => {
    const storage = memoryStorage({ count: 2 });
    assert.equal(await increment(storage), 3);
    assert.equal(await readCount(storage), 3);
  });

  test("starting again sets the count back to 0", async () => {
    const storage = memoryStorage({ count: 5 });
    await reset(storage);
    assert.equal(await readCount(storage), 0);
  });
});
