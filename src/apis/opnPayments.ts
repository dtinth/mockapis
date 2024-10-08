import { Elysia, t } from "elysia"
import { defineApi } from "../defineApi"
// import { EventStore } from "../EventStore"

// interface Events {
//   charges: {
//     to: string;
//     from: string;
//     text: string;
//   };
// }

// function getEventStore(phone: string) {
//   return new EventStore<Events>(`opn-payment:${phone}`);
// }

const elysia = new Elysia({
  prefix: "/opn-payments",
  tags: ["OpnPayments"],
}).post(
  "/charges",
  async ({ body, set }) => {
    const { amount, card, currency, return_uri } = body
    // const eventStore = getEventStore(to);
    // const topic = `opn-payment:${to}`;
    // set.headers["x-mockapis-topic"] = topic;

    // const messageId = Math.random().toString(36).substring(2, 15);

    // await eventStore.add("charges", { to, from, text });

    return {
      object: "charge",
      id: `chrg_test_${card.split("_").pop()}`,
      amount: Number(amount),
      currency: currency,
      return_uri: return_uri ?? undefined,
      description: "lorem ipsum",
      status: "pending",
      authorized: false,
      paid: false,
      created_at: new Date().toISOString(),
    }
  },
  {
    body: t.Object({
      amount: t.String(),
      currency: t.String(),
      card: t.String(),
      return_uri: t.Optional(t.String()),
    }),
    response: t.Object({
      object: t.String(),
      id: t.String(),
      amount: t.Integer(),
      currency: t.String(),
      return_uri: t.Optional(t.String()),
      description: t.String(),
      status: t.String(),
      authorized: t.Boolean(),
      paid: t.Boolean(),
      created_at: t.String(),
    }),
    detail: { summary: "Create Charge" },
  }
)
// .get(
//   "/_test/messages",
//   async ({ query }) => {
//     const eventLog = getEventStore(query.to);
//     return (await eventLog.get())
//       .filter((e) => e.type === "sms")
//       .map((e) => e.payload);
//   },
//   {
//     query: t.Object({
//       to: t.String(),
//     }),
//     response: t.Array(
//       t.Object({
//         to: t.String(),
//         from: t.String(),
//         text: t.String(),
//       })
//     ),
//     detail: { summary: "[Test] Get sent SMS messages" },
//   }
// );

export const opnPayments = defineApi({
  tag: "OpnPayments",
  description:
    "A mock API that implements a subset of the [OpnPayments API](https://docs.opn.ooo) for receiving payments.",
  elysia,
})
