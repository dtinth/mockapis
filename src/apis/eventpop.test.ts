import { expect, test } from "bun:test";
import { api, makeAuthorizationCode } from "./test-utils";

test("Eventpop API", async () => {
  const tester = new EventpopTester();
  const code = await makeAuthorizationCode({
    sub: "user",
  });
  const tokenResponse = (await tester.exchangeCodeForToken(code))!;
  const accessToken = tokenResponse.access_token;
  expect(tokenResponse).toMatchObject({
    access_token: expect.any(String),
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: expect.any(String),
    scope: "public",
    created_at: expect.any(Number),
  });

  // Test user info endpoint
  const userInfo = await tester.getUserInfo(accessToken);
  expect(userInfo).toMatchObject({
    user: {
      id: expect.any(Number),
      full_name: expect.any(String),
      email: expect.any(String),
      avatar: expect.any(String),
      avatars: {
        original: expect.any(String),
        medium: expect.any(String),
        thumb: expect.any(String),
        tiny: expect.any(String),
      },
      birthday: expect.any(String),
      gender: expect.any(String),
      phone: expect.any(String),
    },
  });

  // Test tickets endpoint
  const tickets = await tester.getTickets(accessToken);
  expect(tickets).toMatchObject({
    success: true,
    tickets: expect.any(Array),
    count: expect.any(Number),
    total: expect.any(Number),
    page: expect.any(Number),
    per_page: expect.any(Number),
  });
});

class EventpopTester {
  async exchangeCodeForToken(code: string) {
    const { data } = await api.POST("/eventpop/oauth/token", {
      body: { code },
    });
    return data;
  }

  async getUserInfo(accessToken: string) {
    const { data } = await api.GET("/eventpop/api/public/me", {
      params: { query: { access_token: accessToken } },
    });
    return data;
  }

  async getTickets(accessToken: string) {
    const { data } = await api.GET(
      "/eventpop/api/public/organizers/{organizerId}/tickets",
      {
        params: {
          path: { organizerId: "1" },
          query: { access_token: accessToken },
        },
      }
    );
    return data;
  }
}
