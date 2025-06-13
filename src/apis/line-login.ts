import { Elysia, t } from "elysia";
import { defineApi } from "../defineApi";
import { generateAuthorizationCode, generateAuthorizePage } from "./oauth";

const elysia = new Elysia({ prefix: "/line-login", tags: ["LINE Login"] })
  .get(
    "/oauth2/v2.1/authorize",
    async () => {
      return generateAuthorizePage({
        title: "LINE Login - Authorize",
        header: "LINE Login - Authorize",
        claimsGenerator: `
          const uid = (sessionStorage.uid ||= "U" + Date.now().toString(36));
          form.claims.value = JSON.stringify(
            {
              sub: uid,
              name: "test user",
              picture: "https://profile.line-scdn.net/0h" + uid + "_test_picture",
              email: uid + "@line.me",
              email_verified: true,
              iss: "https://access.line.me",
              aud: params.get("client_id"),
            },
            null,
            2
          );
        `,
        actionUrl: "/line-login/_test/authorize",
      });
    },
    {
      detail: { summary: "Displays a LINE Login authorize page" },
      query: t.Object({
        response_type: t.Optional(t.String()),
        client_id: t.String(),
        redirect_uri: t.String(),
        state: t.Optional(t.String()),
        scope: t.Optional(t.String()),
        nonce: t.Optional(t.String()),
        prompt: t.Optional(t.String()),
        max_age: t.Optional(t.Number()),
        ui_locales: t.Optional(t.String()),
        bot_prompt: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/_test/authorize",
    async ({ body, query }) => {
      const url = new URL(query.redirect_uri);
      const params = new URLSearchParams();
      
      const claims = { ...body.claims };
      params.set("code", generateAuthorizationCode(claims));

      if (query.state != null) {
        params.set("state", query.state);
      }

      url.search = "?" + params.toString();
      return { location: `${url}` };
    },
    {
      body: t.Object({
        claims: t.Any(),
      }),
      query: t.Object({
        response_type: t.Optional(t.String()),
        client_id: t.String(),
        redirect_uri: t.String(),
        state: t.Optional(t.String()),
        scope: t.Optional(t.String()),
        nonce: t.Optional(t.String()),
        prompt: t.Optional(t.String()),
        max_age: t.Optional(t.Number()),
        ui_locales: t.Optional(t.String()),
        bot_prompt: t.Optional(t.String()),
      }),
      response: t.Object({
        location: t.String(),
      }),
      detail: { summary: "[Test] Generates the URL to redirect for LINE Login" },
    }
  );

export const lineLogin = defineApi({
  tag: "LINE Login",
  description: `A mock API that implements LINE Login authorization endpoints corresponding to access.line.me.
  
- The authorize page lets users freely fill in any user information, such as \`sub\`, \`name\`, \`picture\`, and \`email\`.
- This API mimics LINE Login's OAuth 2.0 authorization flow.
- The authorize page is similar to the main OAuth authorize page but tailored for LINE Login claims.`,
  elysia,
});