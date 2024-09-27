import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import Redis from "ioredis";

const redis = new Redis(Bun.env["REDIS_URL"]!);

async function addEventLog(topic: string, type: string, payload: any) {
  const eventData = JSON.stringify({ type, payload, timestamp: Date.now() });
  await redis.rpush(`mockapis:events:${topic}`, eventData);
}

async function getEventLog(topic: string) {
  return (await redis.lrange(`mockapis:events:${topic}`, 0, -1)).map((event) =>
    JSON.parse(event)
  );
}

const line = new Elysia({ prefix: "/line" }).post(
  "/v2/bot/message/push",
  async ({ body }) => {
    const { messages } = body;
    const sentMessages = messages.map((_, index) => ({
      id: `${Date.now()}${index}`,
      quoteToken: Math.random().toString(36).substring(2, 15),
    }));
    const topic = `line:${body.to}`;
    console.log(topic);
    await addEventLog(topic, "push", { body, sentMessages });
    return {
      sentMessages,
    };
  },
  {
    body: t.Object({
      to: t.String(),
      messages: t.Array(
        t.Object({
          type: t.String(),
          text: t.String(),
        })
      ),
      notificationDisabled: t.Optional(t.Boolean()),
      customAggregationUnits: t.Optional(t.Array(t.String())),
    }),
  }
);

const app = new Elysia()
  .use(swagger())
  .use(line)
  .get("/events/:topic", async ({ params }) => {
    console.log(params.topic);
    return getEventLog(params.topic);
  })
  .get("/", () => "Hello Elysia")
  .listen(+(Bun.env["PORT"] || 46982));

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
