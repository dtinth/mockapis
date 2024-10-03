import { html, renderHtml } from "@thai/html";
import { Elysia, t } from "elysia";
import * as jose from "jose";
import { defineApi } from "../defineApi";
import privateKey from "./oauth.private-key.json";
import publicKey from "./oauth.public-key.json";

let privateKeyObject: jose.KeyLike;
const loadPrivateKey = async () => {
  if (!privateKeyObject) {
    privateKeyObject = (await jose.importJWK(
      privateKey,
      "RS256"
    )) as jose.KeyLike;
  }
  return privateKeyObject;
};

let publicKeyObject: jose.KeyLike;
const loadPublicKey = async () => {
  if (!publicKeyObject) {
    publicKeyObject = (await jose.importJWK(
      publicKey,
      "RS256"
    )) as jose.KeyLike;
  }
  return publicKeyObject;
};

export const generateToken = async (payload: jose.JWTPayload) => {
  const key = await loadPrivateKey();
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: "mock" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
};

export async function verifyToken(jwt: string) {
  const key = await loadPublicKey();
  const { payload } = await jose.jwtVerify(jwt, key, {
    algorithms: ["RS256"],
  });
  return payload;
}

export function generateRefreshToken(payload: jose.JWTPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decodeRefreshToken(token: string) {
  return JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
}

const elysia = new Elysia({ prefix: "/oauth", tags: ["OAuth 2.0 / OIDC"] })
  .get(
    "/.well-known/openid-configuration",
    async ({ request }) => {
      const origin = new URL(request.url).origin;
      return {
        id_token_signing_alg_values_supported: ["RS256"],
        issuer: `${origin}/oauth`,
        jwks_uri: `${origin}/oauth/.well-known/jwks`,
        authorization_endpoint: `${origin}/oauth/protocol/openid-connect/authorize`,
        response_types_supported: ["id_token"],
        subject_types_supported: ["public", "pairwise"],
      };
    },
    {
      detail: { summary: "OpenID Connect Discovery" },
    }
  )
  .get(
    "/.well-known/jwks",
    async () => {
      return { keys: [{ kid: "mock", ...publicKey }] };
    },
    {
      response: t.Object(
        {
          keys: t.Array(
            t.Object({ kid: t.String() }, { additionalProperties: true })
          ),
        },
        { additionalProperties: true }
      ),
      detail: { summary: "JSON Web Key Set" },
    }
  )
  .post(
    "/protocol/openid-connect/token",
    async ({ body }) => {
      const { code } = body;
      return {
        access_token: code,
        token_type: "Bearer",
        expires_in: 3600,
        id_token: code,
      };
    },
    {
      body: t.Object({
        grant_type: t.String(),
        code: t.String(),
        client_id: t.String(),
        client_secret: t.String(),
      }),
      response: t.Object({
        access_token: t.String(),
        token_type: t.String(),
        expires_in: t.Number(),
        id_token: t.String(),
      }),
      detail: { summary: "Exchange authorization code for tokens" },
    }
  )
  .get(
    "/protocol/openid-connect/userinfo",
    async ({ headers }) => {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { error: "invalid_token" };
      }

      const token = authHeader.split(" ")[1];
      return verifyToken(token) as any;
    },
    {
      response: t.Object(
        {
          name: t.String(),
          sub: t.String(),
          email: t.String(),
          email_verified: t.Boolean(),
        },
        { additionalProperties: true }
      ),
      headers: t.Object({
        authorization: t.String(),
      }),
      detail: { summary: "Get user information" },
    }
  )
  .get(
    "/protocol/openid-connect/auth",
    async () => {
      const page = html`<!DOCTYPE html>
        <html>
          <head>
            <title>Authorize</title>
          </head>
          <body>
            <h1>Authorize</h1>
            <form id="authorizeForm">
              <p>
                <label for="claims">User info:</label><br />
                <textarea
                  id="claims"
                  name="claims"
                  rows="10"
                  cols="80"
                ></textarea>
              </p>
              <p>
                <button name="button">Authorize</button>
              </p>
            </form>
            <script>
              const form = document.getElementById("authorizeForm");
              const params = new URLSearchParams(location.search);
              if (!form.claims.value) {
                const uid = (sessionStorage.uid ||= "u" + Date.now());
                form.claims.value = JSON.stringify(
                  {
                    name: "test user",
                    email: uid + "@example.com",
                    email_verified: true,
                    sub: uid,
                    iss: location.origin + "/oauth",
                    aud: params.get("client_id"),
                  },
                  null,
                  2
                );
              }
              form.onsubmit = async (event) => {
                event.preventDefault();
                form.button.disabled = true;
                try {
                  const response = await fetch(
                    "/oauth/_test/authorize" + location.search,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        claims: JSON.parse(form.claims.value),
                      }),
                    }
                  );
                  if (!response.ok) {
                    throw new Error(
                      response.status + ": " + (await response.text())
                    );
                  }
                  const data = await response.json();
                  console.log(data);
                  if (data.location) {
                    location.href = data.location;
                  }
                } finally {
                  form.button.disabled = false;
                }
              };
            </script>
          </body>
        </html> `;
      return new Response(renderHtml(page), {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    },
    {
      detail: { summary: "Displays an authorize page" },
      query: t.Object({
        response_type: t.Optional(t.String()),
        response_mode: t.Optional(t.String()),
        redirect_uri: t.String(),
        state: t.Optional(t.String()),
        scope: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/_test/authorize",
    async ({ body, query }) => {
      const token = await generateToken(body.claims);
      const responseType = query.response_type;
      const url = new URL(query.redirect_uri);

      const params = new URLSearchParams();
      if (responseType === "id_token") {
        params.set("id_token", token);
      } else {
        params.set("code", token);
      }
      if (query.state != null) {
        params.set("state", query.state);
      }

      if (query.response_mode === "fragment") {
        url.hash = "#" + params.toString();
      } else {
        url.search = "?" + params.toString();
      }

      return { location: `${url}` };
    },
    {
      body: t.Object({
        claims: t.Any(),
      }),
      query: t.Object({
        response_type: t.Optional(t.String()),
        response_mode: t.Optional(t.String()),
        redirect_uri: t.String(),
        state: t.Optional(t.String()),
        scope: t.Optional(t.String()),
      }),
      response: t.Object({
        location: t.String(),
      }),
      detail: { summary: "[Test] Generates the URL to redirect" },
    }
  );

export const oauth = defineApi({
  tag: "OAuth 2.0 / OIDC",
  description: `A mock OAuth 2.0 and OpenID Connect provider API that lets users authenticate as anyone they wish.

- The API endpoints are designed to mimic [Keycloak](https://www.keycloak.org/)’s paths.
- The authorize page lets user freely fill in any information, such as \`name\`, \`email\`, \`sub\`.
- This API supports both “Authorization Code Flow” and “Implicit Flow with OIDC” (not to be confused with the traditional “Implicit Flow”, which is not supported).
- For OIDC, the discovery endpoint is available at [\`/oauth/.well-known/openid-configuration\`](/oauth/.well-known/openid-configuration)
`,
  elysia,
});
