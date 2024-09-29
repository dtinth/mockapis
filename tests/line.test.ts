import { expect, test } from "bun:test";
import createClient from "openapi-fetch";
import type { paths } from "./api.generated";

const api = createClient<paths>({ baseUrl: "http://localhost:46982" });

test("sends message", async () => {
  const res = await api.POST("/line/v2/bot/message/push", {
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
