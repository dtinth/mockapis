import { Elysia, t } from "elysia";
import { defineApi } from "../defineApi";
import { EventStore } from "../EventStore";

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
      detail: { summary: "[Test] Get messages sent to a user" },
    }
  );

export const line = defineApi({
  tag: "LINE",
  description: `A mock API that implements a subset of the [LINE Messaging API](https://developers.line.biz/en/reference/messaging-api/).`,
  elysia,
});
