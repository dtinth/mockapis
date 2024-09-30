import { Elysia, t } from "elysia";
import { defineApi } from "../defineApi";
import { EventStore } from "../EventStore";

interface Events {
  sms: {
    to: string;
    from: string;
    text: string;
  };
}

function getEventStore(phone: string) {
  return new EventStore<Events>(`vonage:${phone}`);
}

const elysia = new Elysia({ prefix: "/vonage", tags: ["Vonage"] })
  .post(
    "/sms/json",
    async ({ body, set }) => {
      const { to, from, text } = body;
      const eventStore = getEventStore(to);
      const topic = `vonage:${to}`;
      set.headers["x-mockapis-topic"] = topic;

      const messageId = Math.random().toString(36).substring(2, 15);

      await eventStore.add("sms", { to, from, text });

      return {
        "message-count": "1",
        messages: [
          {
            to,
            "message-id": messageId,
            status: "0",
            "remaining-balance": "3.14159265",
            "message-price": "0.03330000",
            network: "12345",
          },
        ],
      };
    },
    {
      body: t.Object({
        api_key: t.String(),
        api_secret: t.String(),
        to: t.String(),
        from: t.String(),
        text: t.String(),
      }),
      response: t.Object({
        "message-count": t.String(),
        messages: t.Array(
          t.Object({
            to: t.String(),
            "message-id": t.String(),
            status: t.String(),
            "remaining-balance": t.String(),
            "message-price": t.String(),
            network: t.String(),
          })
        ),
      }),
      detail: { summary: "Send SMS message" },
    }
  )
  .get(
    "/_test/messages",
    async ({ query }) => {
      const eventLog = getEventStore(query.to);
      return (await eventLog.get())
        .filter((e) => e.type === "sms")
        .map((e) => e.payload);
    },
    {
      query: t.Object({
        to: t.String(),
      }),
      response: t.Array(
        t.Object({
          to: t.String(),
          from: t.String(),
          text: t.String(),
        })
      ),
      detail: { summary: "[Test] Get sent SMS messages" },
    }
  );

export const vonage = defineApi({
  tag: "Vonage",
  description:
    "A mock API that implements a subset of the [Vonage SMS API](https://developer.vonage.com/en/api/sms) for sending SMS messages.",
  elysia,
});
