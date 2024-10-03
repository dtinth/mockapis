import { Elysia, redirect, t } from "elysia";
import { defineApi } from "../defineApi";
import { stringToNumber } from "../stringToNumber";
import {
  decodeAccessToken,
  decodeAuthorizationCode,
  generateAccessToken,
} from "./oauth";

const elysia = new Elysia({
  prefix: "/github",
  tags: ["GitHub"],
})
  .get(
    "/login/oauth/authorize",
    ({ request }) => {
      return redirect(
        `/oauth/protocol/openid-connect/auth?${
          new URL(request.url).searchParams
        }`
      );
    },
    { detail: { summary: "Displays an authorize page" } }
  )
  .post(
    "/login/oauth/access_token",
    async ({ body }) => {
      const { code } = body;
      const payload = decodeAuthorizationCode(code);
      return {
        access_token: generateAccessToken(payload),
        token_type: "Bearer",
        expires_in: 3600,
        scope: payload["scope"] || "",
      };
    },
    {
      body: t.Object({
        code: t.String(),
      }),
      response: t.Object({
        access_token: t.String(),
        token_type: t.String(),
        expires_in: t.Number(),
        scope: t.String(),
      }),
      detail: { summary: "Exchange authorization code for token" },
    }
  )
  .get(
    "/user",
    async ({ headers }) => {
      const authorization = headers.authorization;
      if (!authorization) {
        throw new Error("Unauthorized");
      }
      const token = authorization.split(" ")[1];
      const claims = decodeAccessToken(token);
      const id = stringToNumber(claims["sub"] || "user");
      return {
        login: String(claims["login"] || `user${id}`),
        id: id,
      };
    },
    {
      headers: t.Object({
        authorization: t.String(),
      }),
      response: t.Object({
        login: t.String(),
        id: t.Number(),
        // TODO: Implement more fields
      }),
      detail: { summary: "Get the authenticated user" },
    }
  );

export const github = defineApi({
  tag: "GitHub",
  description:
    "A mock API that implements a subset of the [GitHub API](https://docs.github.com/en/rest).",
  elysia,
});
