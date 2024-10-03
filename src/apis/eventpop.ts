import { Elysia, redirect, t } from "elysia";
import { defineApi } from "../defineApi";
import { stringToNumber } from "../stringToNumber";
import { generateRefreshToken, verifyToken } from "./oauth";

const elysia = new Elysia({
  prefix: "/eventpop",
  tags: ["Eventpop"],
})
  .get("/oauth/authorize", ({ request }) => {
    return redirect(
      `/oauth/protocol/openid-connect/auth?${new URL(request.url).searchParams}`
    );
  })
  .post(
    "/oauth/token",
    async ({ body }) => {
      const { code } = body;
      const payload = await verifyToken(code);
      return {
        access_token: code,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: generateRefreshToken(payload),
        scope: "public",
        created_at: Math.floor(Date.now() / 1000),
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
        refresh_token: t.String(),
        scope: t.String(),
        created_at: t.Number(),
      }),
      detail: { summary: "Exchange authorization code for token" },
    }
  )
  .group("/api/public", (app) =>
    app
      .guard({
        query: t.Object({
          access_token: t.Optional(t.String()),
        }),
      })
      .derive(({ query }) => {
        return {
          accessToken: query["access_token"],
        };
      })
      .get(
        "/me",
        async ({ accessToken }) => {
          if (!accessToken) throw new Error("Unauthorized");
          const payload = await verifyToken(accessToken);
          const id = stringToNumber(payload.sub || "user");
          const avatar = `https://api.dicebear.com/9.x/thumbs/svg?seed=${id}`;
          return {
            user: {
              id: stringToNumber(payload.sub || "user"),
              full_name: String(payload["name"] || "Unknown user"),
              email: String(payload["email"] || "mock@example.com"),
              avatar,
              avatars: {
                original: avatar,
                medium: avatar,
                thumb: avatar,
                tiny: avatar,
              },
              birthday: String(payload["birthday"] || "1990-01-01"),
              gender: String(payload["gender"] || "unspecified"),
              phone: String(payload["phone"] || "0000000000"),
            },
          };
        },
        {
          response: t.Object({
            user: t.Object({
              id: t.Number(),
              full_name: t.String(),
              email: t.String(),
              avatar: t.String(),
              avatars: t.Object({
                original: t.String(),
                medium: t.String(),
                thumb: t.String(),
                tiny: t.String(),
              }),
              birthday: t.String(),
              gender: t.String(),
              phone: t.String(),
            }),
          }),
        }
      )
      .get(
        "/organizers/:organizerId/tickets",
        async () => {
          return {
            success: true,
            tickets: [],
            count: 0,
            total: 0,
            page: 1,
            per_page: 10,
          };
        },
        {
          response: t.Object({
            success: t.Boolean(),
            tickets: t.Array(
              t.Object({
                id: t.Number(),
                event_id: t.Number(),
                status: t.String(),
                firstname: t.String(),
                lastname: t.String(),
                phone: t.String(),
                email: t.String(),
                reference_code: t.String(),
                ticket_type: t.Object({
                  id: t.Number(),
                  name: t.String(),
                  price: t.String(),
                  price_satangs: t.Number(),
                  kind: t.String(),
                }),
              })
            ),
            count: t.Number(),
            total: t.Number(),
            page: t.Number(),
            per_page: t.Number(),
          }),
        }
      )
  );

export const eventpop = defineApi({
  tag: "Eventpop",
  description:
    "A mock API that implements a subset of the [Eventpop Public API](https://docs.eventpop.me/).",
  elysia,
});
