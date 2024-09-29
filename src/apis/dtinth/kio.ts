import { Elysia, t } from "elysia";
import { defineApi } from "../../defineApi";
import { createEventLog } from "../../eventLog";

interface Ticket {
  id: number;
  firstname: string;
  lastname: string;
  ticketTypeId: number;
  referenceCode: string;
}

interface TicketType {
  id: number;
  name: string;
}

const eventLog = createEventLog<{
  register: {
    ticketTypeId: number;
    firstname: string;
    lastname: string;
    referenceCode: string;
  };
  checkIn: {
    referenceCode: string;
  };
  undoCheckIn: {
    referenceCode: string;
  };
}>();

function getTopic(eventId: string) {
  return `dtinth/kio:${eventId}`;
}

async function getState(topic: string) {
  const state = {
    tickets: new Map<number, Ticket>(),
    referenceCodeMap: new Map<string, number>(),
    checkedInIds: new Map<number, number>(),
    ticketTypes: [
      { id: 10001, name: "Regular" },
      { id: 10002, name: "VIP" },
    ] as TicketType[],
  };
  for (const event of await eventLog.get(topic)) {
    if (event.type === "register") {
      const { ticketTypeId, firstname, lastname, referenceCode } =
        event.payload;
      const ticket: Ticket = {
        id: state.tickets.size + 1,
        firstname,
        lastname,
        ticketTypeId,
        referenceCode,
      };
      state.tickets.set(ticket.id, ticket);
      state.referenceCodeMap.set(referenceCode, ticket.id);
    } else if (event.type === "checkIn") {
      const { referenceCode } = event.payload;
      const ticket = state.tickets.get(
        state.referenceCodeMap.get(referenceCode)!
      );
      if (ticket) {
        state.checkedInIds.set(ticket.id, event.timestamp);
      }
    } else if (event.type === "undoCheckIn") {
      const { referenceCode } = event.payload;
      const ticket = state.tickets.get(
        state.referenceCodeMap.get(referenceCode)!
      );
      if (ticket) {
        state.checkedInIds.delete(ticket.id);
      }
    }
  }
  return state;
}

const Ticket = t.Object({
  id: t.Number(),
  firstname: t.String(),
  lastname: t.String(),
  ticketTypeId: t.Number(),
});

const elysia = new Elysia({
  prefix: "/dtinth/kio",
  tags: ["dtinth/kio"],
}).group("/events/:eventId", (app) =>
  app
    .derive(({ params, set }) => {
      const topic = getTopic(params["eventId"]);
      set.headers["x-mockapis-topic"] = topic;
      return { topic };
    })
    .post(
      "/_test/register",
      async ({ body, set, topic }) => {
        const state = await getState(topic);
        if (!state.ticketTypes.some((type) => type.id === body.ticketTypeId)) {
          set.status = "Bad Request";
          return { ok: false, error: "Invalid ticket type" };
        }
        await eventLog.add(topic, "register", body);
        return { ok: true };
      },
      {
        body: t.Object({
          ticketTypeId: t.Number(),
          firstname: t.String(),
          lastname: t.String(),
          referenceCode: t.String(),
        }),
        detail: {
          summary: "[Test] Register a usable ticket in the event",
        },
      }
    )
    .get(
      "/_test/tickets",
      async ({ topic }) => {
        const state = await getState(topic);
        return Array.from(state.tickets.values(), (ticket) => {
          const usedAt = state.checkedInIds.get(ticket.id);
          return {
            ticketInfo: ticket,
            referenceCode: ticket.referenceCode,
            usedAt: usedAt ? new Date(usedAt).toISOString() : undefined,
          };
        });
      },
      {
        response: t.Array(
          t.Object({
            ticketInfo: Ticket,
            referenceCode: t.String(),
            usedAt: t.Optional(t.String()),
          })
        ),
        detail: { summary: "[Test] Get all tickets" },
      }
    )
    .get(
      "/info",
      async ({ topic }) => {
        const state = await getState(topic);
        return {
          eventTitle: "test event",
          checkedIn: state.checkedInIds.size,
          total: state.tickets.size,
          ticketTypes: state.ticketTypes,
        };
      },
      {
        response: t.Object({
          eventTitle: t.String(),
          checkedIn: t.Number(),
          total: t.Number(),
          ticketTypes: t.Array(
            t.Object({
              id: t.Number(),
              name: t.String(),
            })
          ),
        }),
        detail: { summary: "Get event information" },
      }
    )
    .post(
      "/checkIn",
      async ({ body, topic }) => {
        const { refCode } = body as { refCode: string };
        const state = await getState(topic);
        const ticket = state.tickets.get(state.referenceCodeMap.get(refCode)!);
        if (!ticket) {
          return {
            checkedIn: state.checkedInIds.size,
            checkedInTickets: [],
            usedTickets: [],
          };
        }
        if (state.checkedInIds.has(ticket.id)) {
          return {
            checkedIn: state.checkedInIds.size,
            checkedInTickets: [],
            usedTickets: [ticket],
          };
        }
        await eventLog.add(topic, "checkIn", {
          referenceCode: refCode,
        });
        return {
          checkedIn: state.checkedInIds.size + 1,
          checkedInTickets: [ticket],
          usedTickets: [],
        };
      },
      {
        body: t.Object({
          refCode: t.String(),
        }),
        response: t.Object({
          checkedIn: t.Number(),
          checkedInTickets: t.Array(Ticket),
          usedTickets: t.Array(Ticket),
        }),
        detail: { summary: "Check in a ticket" },
      }
    )
    .post(
      "/checkOut",
      async ({ body, topic }) => {
        const { refCode } = body as { refCode: string };
        const state = await getState(topic);
        const ticket = state.tickets.get(state.referenceCodeMap.get(refCode)!);
        if (!ticket) {
          return {
            checkedIn: state.checkedInIds.size,
            undoneTickets: [],
          };
        }
        if (!state.checkedInIds.has(ticket.id)) {
          return {
            checkedIn: state.checkedInIds.size,
            undoneTickets: [],
          };
        }
        await eventLog.add(topic, "undoCheckIn", {
          referenceCode: refCode,
        });
        return {
          checkedIn: state.checkedInIds.size - 1,
          undoneTickets: [ticket],
        };
      },
      {
        body: t.Object({
          refCode: t.String(),
        }),
        response: t.Object({
          checkedIn: t.Number(),
          undoneTickets: t.Array(Ticket),
        }),
        detail: { summary: "Undo check-in" },
      }
    )
);

export const kio = defineApi({
  tag: "dtinth/kio",
  description:
    "A mock API that implements the endpoints expected by [dtinth/kio](https://github.com/dtinth/kio), a geeky self-checkin kiosk.",
  elysia,
});
