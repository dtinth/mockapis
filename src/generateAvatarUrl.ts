import { stringToNumber } from "./stringToNumber";

export function generateAvatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${stringToNumber(
    String(seed)
  )}`;
}
