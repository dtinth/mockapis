import { Elysia, t } from "elysia";
import { defineApi } from "../defineApi";

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
    async function* ({ body }) {
      const { messages, stream } = body;
      const lastMessage = messages[messages.length - 1].content;
      const meowMessage = lastMessage.replace(/\w+/g, (a) =>
        a.toLowerCase() === a ? "meow" : a.toUpperCase() === a ? "MEOW" : "Meow"
      );

      if (!stream) {
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
            prompt_tokens: lastMessage.length,
            completion_tokens: meowMessage.length,
            total_tokens: lastMessage.length + meowMessage.length,
          },
        };
      }

      const chunkMeowMessages = meowMessage.split("");

      // Formats the stream according to the OpenAI API as text/event-stream
      const toStreamMessage = (object: any) => {
        return `data: ${JSON.stringify(object)}\n\n`;
      };

      yield toStreamMessage({
        id: `${Date.now()}`,
        object: "chat.completion.chunk",
        created: Date.now(),
        model: "meowgpt",
        system_fingerprint: "fp_44709d6fcb",
        choices: [
          {
            index: 0,
            delta: { role: "assistant", content: "" },
            logprobs: null,
            finish_reason: null,
          },
        ],
      });
      for (const meow of chunkMeowMessages) {
        await Bun.sleep(1);
        yield toStreamMessage({
          id: `${Date.now()}`,
          object: "chat.completion.chunk",
          created: Date.now(),
          model: "meowgpt",
          system_fingerprint: "fp_44709d6fcb",
          choices: [
            {
              index: 0,
              delta: { content: meow },
              logprobs: null,
              finish_reason: null,
            },
          ],
        });
      }
      yield toStreamMessage({
        id: `${Date.now()}`,
        object: "chat.completion.chunk",
        created: Date.now(),
        model: "meowgpt",
        system_fingerprint: "fp_44709d6fcb",
        choices: [
          { index: 0, delta: {}, logprobs: null, finish_reason: "stop" },
        ],
      });
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
        stream: t.Optional(t.Boolean()),
      }),
      response: t.Union([
        t.Object({
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
        t.AsyncIterator(t.String()),
      ]),
      detail: { summary: "Get chat completion" },
    }
  );

export const openai = defineApi({
  tag: "OpenAI",
  description:
    "A mock API that implements a subset of the [OpenAI API](https://beta.openai.com/docs/api-reference/chat).",
  elysia,
});
