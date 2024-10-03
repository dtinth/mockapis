import { createHash } from "crypto";

/**
 * Converts a string to a number that stays within the range of safe integers.
 */
export function stringToNumber(seed: string) {
  const hash = createHash("sha1").update(seed).digest("hex");
  return parseInt(hash.slice(0, 12), 16);
}
