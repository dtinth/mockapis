import { expect, test } from "bun:test";
import { api } from "./api";

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
