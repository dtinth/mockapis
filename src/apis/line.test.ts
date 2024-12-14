import { expect, test } from "bun:test";
import { api } from "./test-utils";

test("sends message", async () => {
  const tester = new LineTester();
  const uid = tester.generateUserId();
  const sentMessages = await tester.sendMessages(uid, [
    { type: "text", text: "Hello, world1" },
    { type: "text", text: "Hello, world2" },
  ]);

  expect(sentMessages).toEqual(expect.any(Array));

  const receivedMessages = await tester.getReceivedMessages(uid);
  expect(receivedMessages).toEqual([
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

test("get user profile", async () => {
  const tester = new LineTester();
  const accessToken = await tester.addUserProfile({
    userId: "mock_userId",
    displayName: "mock_displayName",
    pictureUrl: "mock_pictureUrl",
    statusMessage: "mock_statusMessage",
  });

  expect(accessToken).not.toBeNull();

  const actual = await tester.getUserProfile(accessToken);

  expect(actual).toEqual({
    userId: "mock_userId",
    displayName: "mock_displayName",
    pictureUrl: "mock_pictureUrl",
    statusMessage: "mock_statusMessage",
  });
});

class LineTester {
  generateUserId() {
    return `U${crypto.randomUUID().replace(/-/g, "")}`;
  }

  async sendMessages(
    to: string,
    messages: Array<{ type: string; text: string }>
  ) {
    const { data } = await api.POST("/line/v2/bot/message/push", {
      body: {
        to,
        messages: messages,
      },
    });
    return data?.sentMessages;
  }

  async getReceivedMessages(uid: string) {
    const { data } = await api.GET("/line/_test/messages", {
      params: { query: { uid } },
    });
    return data;
  }

  async addUserProfile(profile: {
    userId: string;
    displayName: string;
    pictureUrl: string;
    statusMessage: string;
  }) {
    const { data } = await api.POST("/line/_test/v2/profile", {
      body: {
        ...profile,
      },
    });
    return data?.access_token;
  }

  async getUserProfile(accessToken?: string) {
    const { data } = await api.GET("/line/v2/profile", {
      params: {
        header: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    });
    return data;
  }
}
