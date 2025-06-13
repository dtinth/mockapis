import { expect, test } from "bun:test";
import { api, baseUrl, apiFetch } from "./test-utils";

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

test("LINE Login authorize page", async () => {
  const url = new URL("/line-login/oauth2/v2.1/authorize", baseUrl);
  url.searchParams.set("client_id", "test_client");
  url.searchParams.set("redirect_uri", "http://example.com/callback");
  
  const response = await apiFetch.raw(url.toString(), { redirect: "manual" });

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toMatch(/\/oauth\/protocol\/openid-connect\/auth/);
});

test("LINE Login token exchange", async () => {
  const tester = new LineTester();
  
  // Generate a test authorization code with LINE Login claims
  const testClaims = {
    sub: "U12345",
    name: "Test User",
    picture: "https://profile.line-scdn.net/test",
    email: "test@line.me",
    email_verified: true,
  };
  
  const { data: codeData } = await api.POST("/oauth/_test/code", {
    body: { claims: testClaims },
  });
  
  expect(codeData?.code).toBeDefined();
  
  // Exchange the code for tokens
  const { data: tokenData } = await api.GET("/line/oauth2/v2.1/token", {
    params: {
      query: {
        grant_type: "authorization_code",
        code: codeData!.code,
        redirect_uri: "http://example.com/callback",
        client_id: "test_client",
        client_secret: "test_secret",
      },
    },
  });

  expect(tokenData).toEqual({
    access_token: expect.any(String),
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: expect.stringMatching(/^rt_line_/),
    scope: "profile openid email",
    id_token: expect.any(String),
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
