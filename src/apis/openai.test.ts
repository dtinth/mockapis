import { expect, test } from "bun:test";
import OpenAI from "openai";
import { baseUrl } from "./test-utils";

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

  // Read the text from the stream
  let out = "";
  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    out += choice.delta.content ?? "";
  }
  expect(out).toEqual("Meow, meow meow meow?");
});

class OpenAITester {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: "anything works",
      baseURL: baseUrl + "/openai/v1",
    });
  }

  async listModels() {
    const models = await this.openai.models.list();
    return models;
  }

  async getChatCompletion(
    messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>
  ) {
    const completion = await this.openai.chat.completions.create({
      model: "meowgpt",
      messages,
    });
    return completion;
  }

  async getChatCompletionStream(
    messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>
  ) {
    const stream = await this.openai.chat.completions.create({
      model: "meowgpt",
      messages,
      stream: true,
    });
    return stream;
  }
}
