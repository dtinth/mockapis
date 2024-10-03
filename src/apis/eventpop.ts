import { Elysia, redirect, t } from "elysia";
import { defineApi } from "../defineApi";

interface EventpopTicket {
  id: number;
  event_id: number;
  status: string;
  firstname: string;
  lastname: string;
  phone: string;
  email: string;
  reference_code: string;
  ticket_type: {
    id: number;
    name: string;
    /** @example '฿0.00' */
    price: string;
    price_satangs: number;
    kind: "free" | "paid";
  };
}

interface EventpopTicketsResponse {
  success: boolean;
  tickets: EventpopTicket[];
  count: number;
  total: number;
  page: number;
  per_page: number;
}

interface EventpopMeResponse {
  user: {
    id: number;
    full_name: string;
    email: string;
    avatar: string;
    avatars: {
      original: string;
      medium: string;
      thumb: string;
      tiny: string;
    };
    birthday: string;
    gender: string;
    phone: string;
  };
}

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
      return {
        access_token: code,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "TODO",
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
      detail: { summary: "Exchange authorization code for tokens" },
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
      .get("/me", async () => {
        return {
          user: {
            id: 1,
            full_name: "John Doe",
            email: "john@example.com",
            avatar: "https://example.com/avatar.jpg",
            avatars: {
              original: "https://example.com/avatar.jpg",
              medium: "https://example.com/avatar.jpg",
              thumb: "https://example.com/avatar.jpg",
              tiny: "https://example.com/avatar.jpg",
            },
            birthday: "1990-01-01",
            gender: "male",
            phone: "0812345678",
          },
        } as EventpopMeResponse;
      })
      .get("/organizers/:organizerId/tickets", async () => {
        return {
          success: true,
          tickets: [],
          count: 0,
          total: 0,
          page: 1,
          per_page: 10,
        } as EventpopTicketsResponse;
      })
  );

export const eventpop = defineApi({
  tag: "Eventpop",
  description:
    "A mock API that implements a subset of the [Eventpop Public API](https://docs.eventpop.me/).",
  elysia,
});
