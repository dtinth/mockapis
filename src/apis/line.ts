import { html, renderHtml } from "@thai/html";
import { createHash } from "crypto";
import { Elysia, t } from "elysia";
import { defineApi } from "../defineApi";
import { EventStore } from "../EventStore";
import {
  decodeAccessToken,
  decodeAuthorizationCode,
  generateAccessToken,
  generateIdToken,
} from "./oauth";

function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

function generateProfileFromClaims(claims: any) {
  // Only return LINE profile fields, not original claims
  const profile: any = {};

  // Generate missing LINE profile fields
  if (claims.userId) {
    profile.userId = claims.userId;
  } else if (claims.sub) {
    profile.userId = "U" + md5(claims.sub);
  }

  if (claims.displayName) {
    profile.displayName = claims.displayName;
  } else if (claims.name) {
    profile.displayName = claims.name;
  }

  if (claims.pictureUrl) {
    profile.pictureUrl = claims.pictureUrl;
  } else if (claims.sub) {
    profile.pictureUrl = `https://api.dicebear.com/9.x/glass/png?seed=${md5(
      claims.sub
    )}`;
  }

  if (claims.statusMessage) {
    profile.statusMessage = claims.statusMessage;
  } else {
    profile.statusMessage = "testing";
  }

  return profile;
}

interface Events {
  push: {
    body: {
      messages: any[];
    };
    sentMessages: { id: string; quoteToken: string }[];
  };
}

function getEventStore(userId: string) {
  return new EventStore<Events>(`line:${userId}`);
}

const elysia = new Elysia({ prefix: "/line", tags: ["LINE"] })
  .post(
    "/v2/bot/message/push",
    async ({ body, set }) => {
      const { messages } = body;
      const sentMessages = messages.map((_, index) => ({
        id: `${Date.now()}${index}`,
        quoteToken: Math.random().toString(36).substring(2, 15),
      }));
      const eventStore = getEventStore(body.to);
      const topic = `line:${body.to}`;
      set.headers["x-mockapis-topic"] = topic;
      await eventStore.add("push", { body, sentMessages });
      return {
        sentMessages,
      };
    },
    {
      body: t.Object({
        to: t.String(),
        messages: t.Array(t.Any()),
        notificationDisabled: t.Optional(t.Boolean()),
        customAggregationUnits: t.Optional(t.Array(t.String())),
      }),
      response: t.Object({
        sentMessages: t.Array(
          t.Object({
            id: t.String(),
            quoteToken: t.String(),
          })
        ),
      }),
      detail: { summary: "Send push message" },
    }
  )
  .get(
    "/_test/messages",
    async ({ query }) => {
      const eventStore = getEventStore(query.uid);
      return (await eventStore.get())
        .filter((e) => e.type === "push")
        .map((event) => {
          const { body, sentMessages } = event.payload;
          return body.messages.map((message, index) => ({
            id: sentMessages[index].id,
            message,
          }));
        });
    },
    {
      query: t.Object({
        uid: t.String(),
      }),
      response: t.Array(
        t.Array(
          t.Object({
            id: t.String(),
            message: t.Any(),
          })
        )
      ),
      detail: {
        summary: "[Test] Get messages sent to a user.",
        description:
          "To preview as HTML, use the /line/_test/messages.html endpoint",
      },
    }
  )
  .get(
    "/_test/messages.html",
    async ({ query }) => {
      const eventStore = getEventStore(query.uid);
      const events = await eventStore.get();
      const messages = events
        .filter((e) => e.type === "push")
        .flatMap((event) => {
          const { body, sentMessages } = event.payload;
          return body.messages.map((message, index) => ({
            id: sentMessages[index].id,
            message,
          }));
        });

      const page = html`<!DOCTYPE html>
        <html
          data-bs-theme="light"
          style="--bs-body-bg: #8cabd9; --bs-body-color: #000; --bs-heading-color: #000; --bs-secondary-color: #000;"
        >
          <head>
            <title>LINE Messages for ${query.uid}</title>
            <link
              href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
              rel="stylesheet"
            />
            <link
              rel="stylesheet"
              href="https://cdn.jsdelivr.net/npm/flex-render@0.1.8/dist/index.css"
            />
          </head>
          <body>
            <div class="container mt-4">
              <h1 class="h5 mb-3">LINE Messages for ${query.uid}</h1>
              <div class="row">
                ${messages.map(
                  (msg, index) => html`
                    <div class="col-12 mb-3">
                      <div
                        class="card"
                        id="message-card-${index}"
                        data-message-id="${msg.id}"
                        data-message="${JSON.stringify(msg.message)}"
                      >
                        <div class="card-header">
                          <small class="text-muted"
                            >Message ID: ${msg.id}</small
                          >
                        </div>
                        <div class="card-body" style="background: #8cabd9">
                          <div id="message-${index}">Loading…</div>
                          <script>
                            {
                              const messageData = JSON.parse(
                                document.currentScript.closest("[data-message]")
                                  .dataset.message
                              );
                              const container = document.getElementById(
                                "message-${index}"
                              );
                              if (messageData.type === "flex") {
                                import(
                                  "https://cdn.jsdelivr.net/npm/flex-render@0.1.8/+esm"
                                )
                                  .then(({ render }) => {
                                    container.innerHTML = render(
                                      messageData.contents
                                    );
                                  })
                                  .catch((error) => {
                                    console.error(
                                      "Error rendering message:",
                                      error
                                    );
                                    container.innerHTML =
                                      "<pre>Error rendering message</pre>";
                                  });
                              } else {
                                container.innerHTML =
                                  "<pre>" +
                                  JSON.stringify(messageData, null, 2) +
                                  "</pre>";
                              }
                            }
                          </script>
                        </div>
                      </div>
                    </div>
                  `
                )}
              </div>
              ${messages.length === 0
                ? html`
                    <div class="alert alert-info">
                      No messages found for user ${query.uid}.
                    </div>
                  `
                : ""}
            </div>
          </body>
        </html>`;

      return new Response(renderHtml(page), {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    },
    {
      query: t.Object({
        uid: t.String(),
      }),
      detail: { summary: "[Test] Get messages sent to a user as HTML" },
    }
  )
  .post(
    "_test/v2/profile",
    ({ body }) => {
      return {
        access_token: generateAccessToken(body),
        token_type: "Bearer",
        expires_in: 3600,
        scope: "profile",
      };
    },
    {
      body: t.Object({
        userId: t.String(),
        displayName: t.String(),
        pictureUrl: t.String(),
        statusMessage: t.String(),
      }),
      response: t.Object({
        access_token: t.String(),
        token_type: t.String(),
        expires_in: t.Number(),
        scope: t.String(),
      }),
      detail: { summary: "[Test] Add user profile" },
    }
  )
  .get(
    "/v2/profile",
    ({ headers }) => {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { error: "invalid_token" };
      }
      const token = authHeader.split(" ")[1];
      const claims = decodeAccessToken(token);
      return generateProfileFromClaims(claims);
    },
    {
      headers: t.Object({
        authorization: t.String(),
      }),
      response: t.Object({
        userId: t.String(),
        displayName: t.String(),
        pictureUrl: t.String(),
        statusMessage: t.String(),
      }),
      detail: { summary: "Get user profile" },
    }
  )
  .post(
    "/oauth2/v2.1/token",
    async ({ body }) => {
      const { code, client_id, client_secret } = body;

      const claims = decodeAuthorizationCode(code);

      return {
        access_token: generateAccessToken(claims),
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: `rt_line_${Date.now()}`,
        scope: "profile openid email",
        id_token: await generateIdToken(claims),
      };
    },
    {
      body: t.Object({
        grant_type: t.String(),
        code: t.String(),
        redirect_uri: t.String(),
        client_id: t.String(),
        client_secret: t.String(),
      }),
      response: t.Object({
        access_token: t.String(),
        token_type: t.String(),
        expires_in: t.Number(),
        refresh_token: t.String(),
        scope: t.String(),
        id_token: t.String(),
      }),
      detail: { summary: "Exchange authorization code for LINE Login tokens" },
    }
  );

export const line = defineApi({
  tag: "LINE",
  description: `A mock API that implements a subset of the [LINE Messaging API](https://developers.line.biz/en/reference/messaging-api/).`,
  elysia,
});
