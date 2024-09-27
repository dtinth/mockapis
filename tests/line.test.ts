import { edenFetch } from "@elysiajs/eden";
import { expect, test } from "bun:test";
import type { App } from "../src/index";

const api = edenFetch<App>("http://localhost:46982");

test("sends message", async () => {
  const res = await api("/line/v2/bot/message/push", {
    method: "POST",
    body: {
      to: "Umeow",
      messages: [
        { type: "text", text: "Hello, world1" },
        { type: "text", text: "Hello, world2" },
      ],
    },
  });
  expect(res.data?.sentMessages).toEqual(expect.any(Array));
});
