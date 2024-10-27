import crypto from "crypto";

export function randomCodeVerifier(length: number) {
  const array = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(array, (byte) => byte.toString(36))
    .join("")
    .slice(0, length);
}

export function generateCodeChallenge(codeVerifier: string, method = "plain") {
  if (!method || method == "plain") {
    return codeVerifier;
  }
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  return hash.toString("base64url");
}
