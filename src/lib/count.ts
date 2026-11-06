// The count, kept in the Host storage (CONVENTION.md §6.1) under the key `count`, shared by the View and the Widget.
// Replace it with what your Module keeps.

import type { Storage } from "@tessello/sdk";

const KEY = "count";

/** Reads the count; a count never written, or not a whole number, is 0. */
export async function readCount(storage: Storage): Promise<number> {
  const value = await storage.get(KEY);
  return Number.isInteger(value) ? (value as number) : 0;
}

/** Adds one to the count, writes it and returns it. */
export async function increment(storage: Storage): Promise<number> {
  const count = (await readCount(storage)) + 1;
  await storage.set(KEY, count);
  return count;
}

/** Sets the count back to 0. */
export async function reset(storage: Storage): Promise<void> {
  await storage.delete(KEY);
}
