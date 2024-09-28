import { Elysia } from "elysia";

export const kio = new Elysia({
  prefix: "/dtinth/kio",
  tags: ["dtinth/kio"],
}).group("/events/:event", (app) =>
  app.get("/info", async () => {
    return {
      eventTitle: "test event",
      checkedIn: 0,
      total: 0,
      ticketTypes: [],
    };
  })
);
