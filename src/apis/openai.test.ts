import { expect, test } from "bun:test";
import { api } from "./test-utils";

test("lists available models", async () => {
  const tester = new OpenAITester();
  const models = await tester.listModels();
  expect(models).toMatchObject({
    object: "list",
    data: expect.arrayContaining([
      {
        id: "meowgpt",
        object: "model",
        created: expect.any(Number),
        owned_by: "meow",
      },
    ]),
  });
});

test("gets chat completion", async () => {
  const tester = new OpenAITester();
  const completion = await tester.getChatCompletion([
    { role: "user", content: "Hello, how are you?" },
  ]);
  expect(completion).toMatchObject({
    id: expect.any(String),
    object: "chat.completion",
    created: expect.any(Number),
    model: "meowgpt",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Meow, meow meow meow?",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: expect.any(Number),
      completion_tokens: expect.any(Number),
      total_tokens: expect.any(Number),
    },
  });
});

class OpenAITester {
  async listModels() {
    const { data } = await api.GET("/openai/v1/models");
    return data;
  }

  async getChatCompletion(messages: Array<{ role: string; content: string }>) {
    const { data } = await api.POST("/openai/v1/chat/completions", {
      body: {
        model: "meowgpt",
        messages,
      },
    });
    return data;
  }
}
