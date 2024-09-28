import Redis from "ioredis";

const redis = new Redis(Bun.env["REDIS_URL"]!);

function sanitizeTopic(topic: string): string {
  return encodeURIComponent(topic).slice(0, 100);
}

export async function addEventLog(topic: string, type: string, payload: any) {
  const sanitizedTopic = sanitizeTopic(topic);
  const eventData = JSON.stringify({ type, payload, timestamp: Date.now() });
  await redis.rpush(`mockapis:events:${sanitizedTopic}`, eventData);
}

export async function getEventLog(topic: string) {
  const sanitizedTopic = sanitizeTopic(topic);
  return (await redis.lrange(`mockapis:events:${sanitizedTopic}`, 0, -1)).map(
    (event) => JSON.parse(event)
  );
}

type Values<T extends Record<string, any>> = T[keyof T];

export type EventLog<T extends Record<string, any>> = Values<{
  [K in keyof T]: {
    type: K;
    payload: T[K];
    timestamp: number;
  };
}>[];

export function createEventLog<T extends Record<string, any>>() {
  return {
    add: (topic: string, type: keyof T, payload: T[keyof T]) =>
      addEventLog(topic, type as string, payload),
    get: (topic: string) => getEventLog(topic) as Promise<EventLog<T>>,
  };
}
