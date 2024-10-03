import { expect, test } from "bun:test";
import { api, makeAuthorizationCode } from "./test-utils";

test("GitHub OAuth", async () => {
  const tester = new GitHubTester();
  const code = await makeAuthorizationCode({
    sub: crypto.randomUUID(),
    login: "testuser",
    scope: "user",
  });

  // Test token exchange
  const tokenResponse = await tester.exchangeCodeForToken(code);
  const accessToken = tokenResponse.access_token;

  // Test user info endpoint
  const userInfo = await tester.getUserInfo(accessToken);
  expect(userInfo).toMatchObject({
    login: expect.stringMatching(/^(testuser|user\d+)$/),
    id: expect.any(Number),
  });
});

class GitHubTester {
  async exchangeCodeForToken(code: string) {
    const { data } = await api.POST("/github/login/oauth/access_token", {
      body: { code },
    });
    return data!;
  }

  async getUserInfo(accessToken: string) {
    const { data } = await api.GET("/github/user", {
      params: { header: { authorization: `Bearer ${accessToken}` } },
    });
    return data!;
  }
}
