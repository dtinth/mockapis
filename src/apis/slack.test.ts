import { expect, test } from "bun:test";
import { api, apiFetch } from "./test-utils";

test("posts message to channel", async () => {
  const tester = new SlackTester();
  const channelId = tester.generateChannelId();

  const result = await tester.postMessage(channelId, "Hello, world!", {
    username: "Test Bot",
    icon_url: "https://example.com/avatar.png",
  });

  expect(result).toEqual({
    ok: true,
    channel: expect.any(String),
    ts: expect.any(String),
    message: {
      text: "Hello, world!",
      username: "Test Bot",
      type: "message",
      subtype: "bot_message",
      ts: expect.any(String),
    },
  });
});

test("requires authentication", async () => {
  const tester = new SlackTester();
  const channelId = tester.generateChannelId();

  const result = await tester.postMessageWithoutAuth(channelId, "Hello!");

  expect(result).toEqual({
    ok: false,
    error: "not_authed",
  });
});

test("normalizes channel names", async () => {
  const tester = new SlackTester();

  // Test with # prefix
  const result1 = await tester.postMessage("#general", "Test message");
  expect(result1.channel).toMatch(/^C\d{9}$/);

  // Test with @ prefix for DMs
  const result2 = await tester.postMessage("@user123", "DM message");
  expect(result2.channel).toMatch(/^C\d{9}$/);

  // Test with plain channel ID
  const result3 = await tester.postMessage("C123456789", "ID message");
  expect(result3.channel).toBe("C123456789");
});

test("retrieves messages from channel", async () => {
  const tester = new SlackTester();
  const channelId = tester.generateChannelId();

  const result1 = await tester.postMessage(channelId, "First message", {
    username: "Bot1",
  });
  await tester.postMessage(channelId, "Second message", { username: "Bot2" });
  console.log(result1);
  console.log(channelId);

  // Use the response channel ID for retrieval to ensure consistency
  const messages = await tester.getChannelMessages(result1.channel);

  expect(messages).toHaveLength(2);
  expect(messages[0]).toEqual({
    ts: expect.any(String),
    channel: expect.any(String),
    text: "First message",
    username: "Bot1",
    icon_url: undefined,
    timestamp: expect.any(String),
  });
  expect(messages[1]).toEqual({
    ts: expect.any(String),
    channel: expect.any(String),
    text: "Second message",
    username: "Bot2",
    icon_url: undefined,
    timestamp: expect.any(String),
  });
});

test("HTML endpoint displays messages correctly", async () => {
  const tester = new SlackTester();
  const channelId = "general";

  await tester.postMessage(`#${channelId}`, "Test HTML display", {
    username: "HTML Bot",
    icon_url: "https://example.com/bot.png",
  });

  const html = await tester.getChannelMessagesHTML(`#${channelId}`);

  expect(html).toContain("# general");
  expect(html).toContain("Test HTML display");
  expect(html).toContain("HTML Bot");
  expect(html).toContain("bot");
});

test("handles messages without optional fields", async () => {
  const tester = new SlackTester();
  const channelId = tester.generateChannelId();

  const result = await tester.postMessage(channelId, "Simple message");

  expect(result).toEqual({
    ok: true,
    channel: expect.any(String),
    ts: expect.any(String),
    message: {
      text: "Simple message",
      username: "Bot", // Default username
      type: "message",
      subtype: "bot_message",
      ts: expect.any(String),
    },
  });
});

class SlackTester {
  generateChannelId(): string {
    return `C${Math.random().toString().substr(2, 9)}`;
  }

  async postMessage(
    channel: string,
    text: string,
    options: {
      username?: string;
      icon_url?: string;
      link_names?: boolean;
      unfurl_links?: boolean;
      unfurl_media?: boolean;
    } = {}
  ) {
    const { data } = await api.POST("/slack/api/chat.postMessage", {
      body: {
        channel,
        text,
        ...options,
      },
      params: {
        header: {
          authorization: "Bearer test-token",
        },
      },
    });
    return data!;
  }

  async postMessageWithoutAuth(channel: string, text: string) {
    const { data, error } = await api.POST("/slack/api/chat.postMessage", {
      body: {
        channel,
        text,
      },
    });
    return data || error;
  }

  async getChannelMessages(channel: string) {
    const { data } = await api.GET("/slack/_test/messages", {
      params: { query: { channel } },
    });
    return data || [];
  }

  async getChannelMessagesHTML(channel: string): Promise<string> {
    const response = await apiFetch(
      `/slack/_test/messages.html?channel=${encodeURIComponent(channel)}`
    );
    return response;
  }
}
