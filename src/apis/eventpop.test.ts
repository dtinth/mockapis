import { expect, test } from "bun:test";
import { api, makeAuthorizationCode } from "./test-utils";

test("Eventpop OAuth and get tickets", async () => {
  const tester = new EventpopTester();
  const code = await makeAuthorizationCode({
    sub: crypto.randomUUID(),
    name: "Test user",
  });
  const tokenResponse = await tester.exchangeCodeForToken(code);
  const accessToken = tokenResponse.access_token;

  // Test user info endpoint
  const userInfo = await tester.getUserInfo(accessToken);
  expect(userInfo.user.full_name).toEqual("Test user");

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
    return data!;
  }

  async getUserInfo(accessToken: string) {
    const { data } = await api.GET("/eventpop/api/public/me", {
      params: { query: { access_token: accessToken } },
    });
    return data!;
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
    return data!;
  }
}
