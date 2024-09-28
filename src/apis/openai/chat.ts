import { Elysia, t } from "elysia";
import { defineApi } from "../../defineApi";

const elysia = new Elysia({
  prefix: "/openai",
  tags: ["OpenAI"],
})
  .get(
    "/v1/models",
    () => {
      return {
        object: "list",
        data: [
          {
            id: "meowgpt",
            object: "model",
            created: Date.now(),
            owned_by: "meow",
          },
        ],
      };
    },
    {
      response: t.Object({
        object: t.String(),
        data: t.Array(
          t.Object({
            id: t.String(),
            object: t.String(),
            created: t.Number(),
            owned_by: t.String(),
          })
        ),
      }),
      detail: { summary: "List available models" },
    }
  )
  .post(
    "/v1/chat/completions",
    async ({ body }) => {
      const { messages } = body;
      const lastMessage = messages[messages.length - 1].content;
      const meowMessage = lastMessage
        .split(" ")
        .map(() => "meow")
        .join(" ");
      return {
        id: `${Date.now()}`,
        object: "chat.completion",
        created: Date.now(),
        model: "meowgpt",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: meowMessage,
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    },
    {
      body: t.Object({
        model: t.String(),
        messages: t.Array(
          t.Object({
            role: t.String(),
            content: t.String(),
          })
        ),
      }),
      response: t.Object({
        id: t.String(),
        object: t.String(),
        created: t.Number(),
        model: t.String(),
        choices: t.Array(
          t.Object({
            index: t.Number(),
            message: t.Object({
              role: t.String(),
              content: t.String(),
            }),
            finish_reason: t.String(),
          })
        ),
        usage: t.Object({
          prompt_tokens: t.Number(),
          completion_tokens: t.Number(),
          total_tokens: t.Number(),
        }),
      }),
      detail: { summary: "Get chat completion" },
    }
  );

export const openaiChat = defineApi({
  tag: "OpenAI",
  description:
    "A mock API that implements a subset of the [OpenAI API](https://beta.openai.com/docs/api-reference/chat).",
  elysia,
});
