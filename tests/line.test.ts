import { expect, test } from "bun:test";
import { api } from "./api";

test("sends message", async () => {
  const uid = crypto.randomUUID();
  const res = await api.POST("/line/v2/bot/message/push", {
    body: {
      to: uid,
      messages: [
        { type: "text", text: "Hello, world1" },
        { type: "text", text: "Hello, world2" },
      ],
    },
  });
  expect(res.data?.sentMessages).toEqual(expect.any(Array));

  const messages = await api.GET("/line/_test/messages", {
    params: { query: { uid } },
  });
  expect(messages.data).toEqual([
    [
      {
        id: expect.any(String),
        message: { type: "text", text: "Hello, world1" },
      },
      {
        id: expect.any(String),
        message: { type: "text", text: "Hello, world2" },
      },
    ],
  ]);
});
