import { Elysia, t } from "elysia";
import { defineApi } from "../defineApi";
import { EventStore, View } from "../EventStore";

interface Events {
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
}

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

class EventView extends View<Events> {
  tickets = new Map<number, Ticket>();
  referenceCodeMap = new Map<string, number>();
  checkedInIds = new Map<number, number>();
  ticketTypes = [
    { id: 10001, name: "Regular" },
    { id: 10002, name: "VIP" },
  ] as TicketType[];

  handleEvent = this.createEventHandler({
    register: (event) => {
      const { ticketTypeId, firstname, lastname, referenceCode } =
        event.payload;
      const ticket: Ticket = {
        id: this.tickets.size + 1,
        firstname,
        lastname,
        ticketTypeId,
        referenceCode,
      };
      this.tickets.set(ticket.id, ticket);
      this.referenceCodeMap.set(referenceCode, ticket.id);
    },
    checkIn: (event) => {
      const { referenceCode } = event.payload;
      const ticket = this.tickets.get(
        this.referenceCodeMap.get(referenceCode)!
      );
      if (ticket) {
        this.checkedInIds.set(ticket.id, event.timestamp);
      }
    },
    undoCheckIn: (event) => {
      const { referenceCode } = event.payload;
      const ticket = this.tickets.get(
        this.referenceCodeMap.get(referenceCode)!
      );
      if (ticket) {
        this.checkedInIds.delete(ticket.id);
      }
    },
  });
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
      const topic = `dtinth/kio:${params["eventId"]}`;
      set.headers["x-mockapis-topic"] = topic;
      const eventStore = new EventStore<Events>(topic);
      const getView = () => new EventView().loadFrom(eventStore);
      return { eventStore, getView };
    })
    .post(
      "/_test/register",
      async ({ body, set, getView, eventStore: eventLog }) => {
        const view = await getView();
        if (!view.ticketTypes.some((type) => type.id === body.ticketTypeId)) {
          set.status = "Bad Request";
          return { ok: false, error: "Invalid ticket type" };
        }
        await eventLog.add("register", body);
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
      "/info",
      async ({ getView }) => {
        const view = await getView();
        return {
          eventTitle: "test event",
          checkedIn: view.checkedInIds.size,
          total: view.tickets.size,
          ticketTypes: view.ticketTypes,
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
      async ({ body, getView, eventStore: eventLog }) => {
        const { refCode } = body as { refCode: string };
        const view = await getView();
        const ticket = view.tickets.get(view.referenceCodeMap.get(refCode)!);
        if (!ticket) {
          return {
            checkedIn: view.checkedInIds.size,
            checkedInTickets: [],
            usedTickets: [],
          };
        }
        if (view.checkedInIds.has(ticket.id)) {
          return {
            checkedIn: view.checkedInIds.size,
            checkedInTickets: [],
            usedTickets: [ticket],
          };
        }
        view.handleEvent(
          await eventLog.add("checkIn", {
            referenceCode: refCode,
          })
        );
        return {
          checkedIn: view.checkedInIds.size,
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
      async ({ body, getView, eventStore: eventLog }) => {
        const { refCode } = body as { refCode: string };
        const view = await getView();
        const ticket = view.tickets.get(view.referenceCodeMap.get(refCode)!);
        if (!ticket) {
          return {
            checkedIn: view.checkedInIds.size,
            undoneTickets: [],
          };
        }
        if (!view.checkedInIds.has(ticket.id)) {
          return {
            checkedIn: view.checkedInIds.size,
            undoneTickets: [],
          };
        }
        view.handleEvent(
          await eventLog.add("undoCheckIn", {
            referenceCode: refCode,
          })
        );
        return {
          checkedIn: view.checkedInIds.size,
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
    .get(
      "/_test/tickets",
      async ({ getView }) => {
        const view = await getView();
        return Array.from(view.tickets.values(), (ticket) => {
          const usedAt = view.checkedInIds.get(ticket.id);
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
);

export const dtinthKio = defineApi({
  tag: "dtinth/kio",
  description:
    "A mock API that implements the endpoints expected by [dtinth/kio](https://github.com/dtinth/kio), a geeky self-checkin kiosk.",
  elysia,
});
