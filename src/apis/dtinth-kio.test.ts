import { expect, test } from "bun:test";
import { api, type paths } from "./test-utils";

test("get event info", async () => {
  const tester = new KioTester();
  expect(await tester.getEventInfo()).toMatchObject({
    eventTitle: expect.any(String),
    checkedIn: 0,
  });
});

test("normal check in", async () => {
  const tester = new KioTester();
  await tester.registerTicket({
    ticketTypeId: 10001,
    firstname: "John",
    lastname: "Doe",
    referenceCode: "ABC123",
  });
  expect(await tester.getEventInfo()).toMatchObject({
    checkedIn: 0,
    total: 1,
  });

  const checkInResult = await tester.checkIn("ABC123");
  expect(checkInResult).toMatchObject({
    checkedIn: 1,
    checkedInTickets: [
      {
        id: expect.any(Number),
        firstname: "John",
        lastname: "Doe",
        ticketTypeId: 10001,
      },
    ],
    usedTickets: [],
  });

  expect(await tester.getEventInfo()).toMatchObject({
    checkedIn: 1,
    total: 1,
  });

  const allTickets = await tester.getAllTickets();
  expect(allTickets).toEqual([
    expect.objectContaining({
      usedAt: expect.any(String),
    }),
  ]);
});

test("undo check in", async () => {
  const tester = new KioTester();
  await tester.registerTicket({
    ticketTypeId: 10001,
    firstname: "Jane",
    lastname: "Smith",
    referenceCode: "XYZ789",
  });

  await tester.checkIn("XYZ789");

  const undoResult = await tester.undoCheckIn("XYZ789");
  expect(undoResult).toMatchObject({
    checkedIn: 0,
    undoneTickets: [
      {
        id: expect.any(Number),
        firstname: "Jane",
        lastname: "Smith",
        ticketTypeId: 10001,
      },
    ],
  });

  expect(await tester.getEventInfo()).toMatchObject({
    checkedIn: 0,
    total: 1,
  });
});

test("ticket already used", async () => {
  const tester = new KioTester();
  await tester.registerTicket({
    ticketTypeId: 10001,
    firstname: "Alice",
    lastname: "Johnson",
    referenceCode: "DEF456",
  });

  await tester.checkIn("DEF456");

  const secondCheckInResult = await tester.checkIn("DEF456");
  expect(secondCheckInResult).toMatchObject({
    checkedIn: 1,
    checkedInTickets: [],
    usedTickets: [
      {
        id: expect.any(Number),
        firstname: "Alice",
        lastname: "Johnson",
        ticketTypeId: 10001,
      },
    ],
  });

  expect(await tester.getEventInfo()).toMatchObject({
    checkedIn: 1,
    total: 1,
  });
});

test("nonexistent ticket", async () => {
  const tester = new KioTester();

  const checkInResult = await tester.checkIn("NONEXISTENT");
  expect(checkInResult).toMatchObject({
    checkedIn: 0,
    checkedInTickets: [],
    usedTickets: [],
  });

  expect(await tester.getEventInfo()).toMatchObject({
    checkedIn: 0,
    total: 0,
  });
});

class KioTester {
  eventId = crypto.randomUUID();
  async registerTicket(
    ticket: paths["/dtinth/kio/events/{eventId}/_test/register"]["post"]["requestBody"]["content"]["application/json"]
  ) {
    const { response } = await api.POST(
      "/dtinth/kio/events/{eventId}/_test/register",
      {
        params: { path: { eventId: this.eventId } },
        body: ticket,
      }
    );
    expect(response.status).toEqual(200);
  }

  async getEventInfo() {
    const { data } = await api.GET("/dtinth/kio/events/{eventId}/info", {
      params: { path: { eventId: this.eventId } },
    });
    return data;
  }

  async getAllTickets() {
    const { data } = await api.GET(
      "/dtinth/kio/events/{eventId}/_test/tickets",
      { params: { path: { eventId: this.eventId } } }
    );
    return data;
  }

  async checkIn(refCode: string) {
    const { data } = await api.POST("/dtinth/kio/events/{eventId}/checkIn", {
      params: { path: { eventId: this.eventId } },
      body: { refCode },
    });
    return data;
  }

  async undoCheckIn(refCode: string) {
    const { data } = await api.POST("/dtinth/kio/events/{eventId}/checkOut", {
      params: { path: { eventId: this.eventId } },
      body: { refCode },
    });
    return data;
  }
}
