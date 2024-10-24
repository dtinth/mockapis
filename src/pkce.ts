import crypto from "crypto";

function base64URLEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function randomCodeVerifier(length: number) {
  const array = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(array, (byte) => byte.toString(36))
    .join("")
    .substr(0, length);
}

export function generateCodeChallenge(codeVerifier: string, method = "plain") {
  if (!method || method == "plain") {
    return codeVerifier;
  }
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  return base64URLEncode(hash);
}
