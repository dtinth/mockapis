import { html, renderHtml } from "@thai/html";
import { Elysia, t } from "elysia";
import { createHash } from "node:crypto";
import { defineApi } from "../defineApi";
import { EventStore } from "../EventStore";

interface Events {
  postMessage: {
    body: {
      channel: string;
      text: string;
      username?: string;
      icon_url?: string;
      link_names?: boolean;
      unfurl_links?: boolean;
      unfurl_media?: boolean;
    };
    response: {
      ok: boolean;
      channel: string;
      ts: string;
      message: {
        text: string;
        username?: string;
        type: string;
        subtype: string;
        ts: string;
      };
    };
  };
}

function getEventStore(channel: string) {
  return new EventStore<Events>(`slack:${channel}`);
}

function generateTimestamp(): string {
  const now = Date.now();
  // Slack format: seconds.microseconds (we'll use random digits for microseconds)
  const randomMicroseconds = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${Math.floor(now / 1000)}.${String(now % 1000).padStart(
    3,
    "0"
  )}${randomMicroseconds}`;
}

function normalizeChannelId(channel: string): string {
  // If it starts with # or @, convert to a deterministic mock channel ID
  if (channel.startsWith("#") || channel.startsWith("@")) {
    const hash = createHash("md5").update(channel).digest("hex");
    const num = parseInt(hash.substring(0, 10), 16);
    return `C${num.toString().slice(0, 9).padStart(9, "0").toUpperCase()}`;
  }
  return channel;
}

const elysia = new Elysia({ prefix: "/slack", tags: ["Slack"] })
  .post(
    "/api/chat.postMessage",
    async ({ body, set, headers }) => {
      // Check for Authorization header
      const authHeader = headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return {
          ok: false,
          error: "not_authed",
        };
      }

      const { channel, text, username } = body;
      const normalizedChannel = normalizeChannelId(channel);
      const timestamp = generateTimestamp();

      const message = {
        text,
        username: username || "Bot",
        type: "message",
        subtype: "bot_message",
        ts: timestamp,
      };

      const response = {
        ok: true as const,
        channel: normalizedChannel,
        ts: timestamp,
        message,
      };

      const eventStore = getEventStore(normalizedChannel);
      const topic = `slack:${normalizedChannel}`;
      set.headers["x-mockapis-topic"] = topic;
      await eventStore.add("postMessage", {
        body: { ...body, channel: normalizedChannel },
        response,
      });

      return response;
    },
    {
      body: t.Object(
        {
          channel: t.String(),
          text: t.String(),
          username: t.Optional(t.String()),
          icon_url: t.Optional(t.String()),
        },
        { additionalProperties: true }
      ),
      response: t.Union([
        t.Object({
          ok: t.Literal(true),
          channel: t.String(),
          ts: t.String(),
          message: t.Object({
            text: t.String(),
            username: t.Optional(t.String()),
            type: t.String(),
            subtype: t.String(),
            ts: t.String(),
          }),
        }),
        t.Object({
          ok: t.Literal(false),
          error: t.String(),
        }),
      ]),
      detail: { summary: "Send a message to a channel" },
    }
  )
  .get(
    "/_test/messages",
    async ({ query }) => {
      const normalizedChannel = normalizeChannelId(query.channel);
      const eventStore = getEventStore(normalizedChannel);
      const events = await eventStore.get();

      return events
        .filter((e) => e.type === "postMessage")
        .map((event) => {
          const { body, response } = event.payload;
          return {
            ts: response.ts,
            channel: response.channel,
            text: body.text,
            username: body.username,
            icon_url: body.icon_url,
            timestamp: event.timestamp.toString(),
          };
        });
    },
    {
      query: t.Object({
        channel: t.String(),
      }),
      response: t.Array(
        t.Object({
          ts: t.String(),
          channel: t.String(),
          text: t.String(),
          username: t.Optional(t.String()),
          icon_url: t.Optional(t.String()),
          timestamp: t.String(),
        })
      ),
      detail: {
        summary: "[Test] Get messages sent to a channel",
        description:
          "To preview as HTML, use the /slack/_test/messages.html endpoint",
      },
    }
  )
  .get(
    "/_test/messages.html",
    async ({ query }) => {
      const normalizedChannel = normalizeChannelId(query.channel);
      const eventStore = getEventStore(normalizedChannel);
      const events = await eventStore.get();

      const messages = events
        .filter((e) => e.type === "postMessage")
        .map((event) => {
          const { body, response } = event.payload;
          return {
            ts: response.ts,
            channel: response.channel,
            text: body.text,
            username: body.username || "Bot",
            icon_url: body.icon_url,
            timestamp: new Date(event.timestamp).toLocaleString(),
          };
        });

      const page = html`<!DOCTYPE html>
        <html>
          <head>
            <title>Slack Messages for ${query.channel}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
              rel="preconnect"
              href="https://fonts.gstatic.com"
              crossorigin
            />
            <link
              href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap"
              rel="stylesheet"
            />
            <style>
              body {
                background: #f8f8f8;
                font-family: "Lato", Slack-Lato, appleLogo, sans-serif;
                margin: 0;
                padding: 0;
                color: #1d1c1d;
              }
              .header {
                background: #4a154b;
                color: #fff;
                padding: 16px 20px;
                font-size: 18px;
                font-weight: 700;
              }
              .channel-name {
                font-size: 24px;
                margin: 0;
              }
              .messages-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              .message {
                background: #fff;
                border: 1px solid #e1e1e1;
                border-radius: 8px;
                margin-bottom: 12px;
                padding: 16px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              .message-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                gap: 8px;
              }
              .avatar {
                width: 32px;
                height: 32px;
                border-radius: 4px;
                background: #4a154b;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
              }
              .username {
                font-weight: 700;
                color: #1d1c1d;
                font-size: 15px;
              }
              .timestamp {
                color: #616061;
                font-size: 12px;
                margin-left: auto;
              }
              .message-text {
                color: #1d1c1d;
                line-height: 1.46668;
                white-space: pre-wrap;
                margin-left: 40px;
              }
              .no-messages {
                text-align: center;
                color: #616061;
                font-style: italic;
                margin-top: 40px;
              }
              .bot-badge {
                background: #007a5a;
                color: white;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                padding: 1px 4px;
                border-radius: 3px;
                margin-left: 4px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="channel-name">${normalizedChannel}</div>
            </div>
            <div class="messages-container">
              ${messages.map(
                (msg) => html`
                  <div class="message">
                    <div class="message-header">
                      ${msg.icon_url
                        ? html`<img
                            src="${msg.icon_url}"
                            alt="${msg.username}"
                            class="avatar"
                          />`
                        : html`<div class="avatar">
                            ${msg.username.charAt(0).toUpperCase()}
                          </div>`}
                      <span class="username">${msg.username}</span>
                      <span class="bot-badge">bot</span>
                      <span class="timestamp">${msg.timestamp}</span>
                    </div>
                    <div class="message-text">${msg.text}</div>
                  </div>
                `
              )}
              ${messages.length === 0
                ? html`
                    <div class="no-messages">
                      No messages found for channel ${query.channel}.
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
        channel: t.String(),
      }),
      detail: { summary: "[Test] Get messages sent to a channel as HTML" },
    }
  );

export const slack = defineApi({
  tag: "Slack",
  description: `A mock API that implements a subset of the [Slack Web API](https://api.slack.com/web) for posting messages.`,
  elysia,
});
