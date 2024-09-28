import { Stream } from "@elysiajs/stream";
import { Elysia, t } from "elysia";

export const openaiChat = new Elysia({
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
      const { messages, stream } = body;
      const lastMessage = messages[messages.length - 1].content;
      const meowWords = lastMessage.split(" ").map(() => "meow");
      if (stream) {
        return new Stream(async (stream) => {
          for (const word of meowWords) {
            stream.send(
              JSON.stringify({
                id: `${Date.now()}`,
                object: "chat.completion.chunk",
                created: Date.now(),
                model: "meowgpt",
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: word + " ",
                    },
                    finish_reason: null,
                  },
                ],
              })
            );
          }

          // Send the final chunk
          stream.send(
            JSON.stringify({
              id: `${Date.now()}`,
              object: "chat.completion.chunk",
              created: Date.now(),
              model: "meowgpt",
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: "stop",
                },
              ],
            })
          );

          stream.close();
        }) as any;
      }

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
              content: meowWords.join(" "),
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
        stream: t.Optional(t.Nullable(t.Boolean())),
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
