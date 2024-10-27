import { expect, test } from "bun:test";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { api, apiFetch, baseUrl } from "./test-utils";
import { generateCodeChallenge, randomCodeVerifier } from "../pkce";

test("OpenID Connect Discovery", async () => {
  const tester = new OAuthTester();
  const config = await tester.getOpenIdConfiguration();
  expect(config).toMatchObject({
    id_token_signing_alg_values_supported: ["RS256"],
    issuer: expect.stringContaining("/oauth"),
    jwks_uri: expect.stringContaining("/oauth/.well-known/jwks"),
    authorization_endpoint: expect.stringContaining(
      "/oauth/protocol/openid-connect/authorize"
    ),
  });
});

test("Authorization Code Flow", async () => {
  const tester = new OAuthTester();

  const claims = {
    name: "Test User",
    email: "testuser@example.com",
    email_verified: true,
    sub: "test123",
  };
  const code = await tester.getAuthorizeCode(claims);
  const result = await tester.exchangeCode(code);
  const userInfo = await tester.getUserInfo(result.access_token);
  expect(userInfo).toMatchObject(claims);
});

test("Authorization Code Flow with PKCE", async () => {
  const tester = new OAuthTester();

  const claims = {
    name: "Test User",
    email: "testuser@example.com",
    email_verified: true,
    sub: "test123",
  };
  const codeVerifier = randomCodeVerifier(64);
  const codeChallengeMethod = "S256";
  const codeChallenge = generateCodeChallenge(
    codeVerifier,
    codeChallengeMethod
  );
  const code = await tester.getAuthorizeCodeWithPKCE(
    claims,
    codeChallenge,
    codeChallengeMethod
  );
  const result = await tester.exchangeCode(code, codeVerifier);
  const userInfo = await tester.getUserInfo(result.access_token);
  expect(userInfo).toMatchObject(claims);
});

test("OIDC Flow", async () => {
  const tester = new OAuthTester();

  const claims = {
    name: "Test User",
    email: "testuser@example.com",
    email_verified: true,
    sub: "test123",
  };
  const idToken = await tester.getIdToken(claims);
  await tester.verifyIdToken(idToken);
});

class OAuthTester {
  async getOpenIdConfiguration() {
    const data = await apiFetch("/oauth/.well-known/openid-configuration");
    return data;
  }

  async getJwks() {
    const data = await apiFetch("/oauth/.well-known/jwks");
    return data;
  }

  async getAuthorizeCode(claims: object) {
    const { data } = await api.POST("/oauth/_test/authorize", {
      body: { claims },
      params: {
        query: {
          response_type: "code",
          redirect_uri: "http://localhost/callback",
          state: "test_state",
        },
      },
    });
    const code = new URL(data!.location).searchParams.get("code");
    return code as string;
  }

  async getAuthorizeCodeWithPKCE(
    claims: object,
    codeChallenge: string = "",
    codeChallengeMethod: string = "plain"
  ) {
    const { data } = await api.POST("/oauth/_test/authorize", {
      body: { claims },
      params: {
        query: {
          response_type: "code",
          redirect_uri: "http://localhost/callback",
          state: "test_state",
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        },
      },
    });
    const code = new URL(data!.location).searchParams.get("code");
    return code as string;
  }

  async getIdToken(claims: object) {
    const { data } = await api.POST("/oauth/_test/authorize", {
      body: {
        claims: { ...claims, iss: `${baseUrl}/oauth`, aud: "OAuthTester" },
      },
      params: {
        query: {
          response_type: "id_token",
          response_mode: "query",
          redirect_uri: "http://localhost/callback",
          state: "test_state",
        },
      },
    });
    const idToken = new URL(data!.location).searchParams.get("id_token");
    return idToken as string;
  }

  async exchangeCode(code: string, codeVerifier?: string) {
    const { data } = await api.POST("/oauth/protocol/openid-connect/token", {
      body: {
        grant_type: "authorization_code",
        code,
        client_id: "test_client",
        client_secret: "test_secret",
        code_verifier: codeVerifier,
      },
    });
    return data!;
  }

  async getUserInfo(accessToken: string) {
    const { data } = await api.GET("/oauth/protocol/openid-connect/userinfo", {
      params: {
        header: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    });
    return data;
  }

  async verifyIdToken(idToken: string) {
    const config = await this.getOpenIdConfiguration();
    const issuer = config.issuer;
    const audience = "OAuthTester";
    const keySetUrl = new URL(config.jwks_uri);
    const keySet = createRemoteJWKSet(keySetUrl);
    return jwtVerify(idToken, keySet, { issuer, audience });
  }
}
