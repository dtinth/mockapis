import Redis from "ioredis";

const redis = new Redis(Bun.env["REDIS_URL"]!);

function sanitizeTopic(topic: string): string {
  return encodeURIComponent(topic).slice(0, 100);
}

export async function addEvent(topic: string, type: string, payload: any) {
  const sanitizedTopic = sanitizeTopic(topic);
  const eventData = JSON.stringify({ type, payload, timestamp: Date.now() });
  await redis.rpush(`mockapis:events:${sanitizedTopic}`, eventData);
}

export async function getEvents(topic: string) {
  const sanitizedTopic = sanitizeTopic(topic);
  return (await redis.lrange(`mockapis:events:${sanitizedTopic}`, 0, -1)).map(
    (event) => JSON.parse(event)
  );
}

type EventPayloadMapping = Record<string, any>;

type Values<T extends EventPayloadMapping> = T[keyof T];

export type EventObject<T extends EventPayloadMapping> = Values<{
  [K in keyof T]: {
    type: K;
    payload: T[K];
    timestamp: number;
  };
}>;

export interface EventUtils<T extends EventPayloadMapping> {
  createEventHandler<R>(
    handler: (event: EventObject<T>) => R
  ): (event: EventObject<T>) => R;
}

export function defineEvents<T extends EventPayloadMapping>(): EventUtils<T> {
  return {
    createEventHandler(handler) {
      return handler;
    },
  };
}

export class EventLog<T extends EventPayloadMapping> {
  constructor(public topic: string, _def: EventUtils<T>) {}
  get() {
    return getEvents(this.topic) as Promise<EventObject<T>[]>;
  }
  add<K extends keyof T & string>(type: K, payload: T[K]) {
    return addEvent(this.topic, type, payload);
  }
}
