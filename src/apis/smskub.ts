import { Elysia, t } from "elysia";
import { defineApi } from "../defineApi";
import { EventStore } from "../EventStore";

interface Events {
  quickMessage: {
    to: string[];
    from: string;
    message: string;
  };
}

function getEventStore(phone: string) {
  return new EventStore<Events>(`smskub:${phone}`);
}

const elysia = new Elysia({ prefix: "/smskub", tags: ["SMSKUB"] })
  .post(
    "/api/messages",
    async ({ body, set }) => {
      const { to, from, message } = body;
      const toPhones = to.join("-");
      const topic = `smskub:${toPhones}`;
      set.headers["x-mockapis-topic"] = topic;

      for (const phone of to) {
        const eventStore = getEventStore(phone);
        await eventStore.add("quickMessage", { to, from, message });
      }

      return {
        balance: 23063,
        code: 200,
        data: {
          total: to.length,
          block: 0,
          send: to.length,
          used: 0,
          balance: 23063,
          type: "OTP",
          is_schedule: null,
          id: "000000000000000000000000",
        },
        message: "Success",
      };
    },
    {
      body: t.Object({
        to: t.Array(t.String()),
        from: t.String(),
        message: t.String(),
      }),
      response: t.Object({
        balance: t.Numeric(),
        code: t.Numeric(),
        data: t.Object({
          total: t.Numeric(),
          block: t.Numeric(),
          send: t.Numeric(),
          used: t.Numeric(),
          balance: t.Numeric(),
          type: t.String(),
          is_schedule: t.Any(),
          id: t.String(),
        }),
        message: t.String(),
      }),
      detail: { summary: "Send SMS quick message" },
    },
  )
  .get(
    "/_test/messages",
    async ({ query }) => {
      const eventLog = getEventStore(query.to);
      return (await eventLog.get())
        .filter((e) => e.type === "quickMessage")
        .map((e) => e.payload);
    },
    {
      query: t.Object({
        to: t.String(),
      }),
      response: t.Array(
        t.Object({
          to: t.Array(t.String()),
          from: t.String(),
          message: t.String(),
        }),
      ),
      detail: { summary: "[Test] Get sent SMS Quick messages" },
    },
  );

export const smskub = defineApi({
  tag: "SMSKUB",
  description: `A mock API that implements a subset of the [SMSKUB API](https://documenter.getpostman.com/view/9887776/VV4xvFoy#6cfa0c23-5f08-4f80-9e62-ffbf10dd75ea) for sending SMS quick messages.`,
  elysia,
});
