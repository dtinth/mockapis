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

test("gets chat completion (stream)", async () => {
  const tester = new OpenAITester();
  const stream = await tester.getChatCompletionStream([
    { role: "user", content: "Hello, how are you?" },
  ]);

  expect(stream).toBeDefined();
  if (!stream) {
    throw new Error("completion is not readable stream");
  }

  const completion = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    completion.push(JSON.parse(new TextDecoder().decode(value)));
  }

  expect(completion.length).toBe(3);

  expect(completion[0]).toMatchObject({
    id: expect.any(String),
    object: "chat.completion.chunk",
    created: expect.any(Number),
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

  expect(completion[1]).toMatchObject({
    id: expect.any(String),
    object: "chat.completion.chunk",
    created: expect.any(Number),
    model: "meowgpt",
    system_fingerprint: "fp_44709d6fcb",
    choices: [
      {
        index: 0,
        delta: { content: "Meow, meow meow meow?" },
        logprobs: null,
        finish_reason: null,
      },
    ],
  });

  expect(completion[2]).toMatchObject({
    id: expect.any(String),
    object: "chat.completion.chunk",
    created: expect.any(Number),
    model: "meowgpt",
    system_fingerprint: "fp_44709d6fcb",
    choices: [
      {
        index: 0,
        delta: {},
        logprobs: null,
        finish_reason: "stop",
      },
    ],
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

  async getChatCompletionStream(
    messages: Array<{ role: string; content: string }>,
  ) {
    const { data } = await api.POST("/openai/v1/chat/completions", {
      body: {
        model: "meowgpt",
        messages,
        stream: true,
      },
      parseAs: "stream",
    });
    return data;
  }
}
