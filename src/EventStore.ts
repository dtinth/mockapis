import Redis from "ioredis";

const redis = new Redis(Bun.env["REDIS_URL"]!);

function getKey(topic: string): string {
  const sanitizedTopic = encodeURIComponent(topic).slice(0, 100);
  return `mockapis:events:${sanitizedTopic}`;
}

export async function addEvent(topic: string, type: string, payload: any) {
  const key = getKey(topic);
  const memoryUsage = await redis.memory("USAGE", key);
  const eventObject = { type, payload, timestamp: Date.now() };
  const eventData = JSON.stringify(eventObject);
  const maxKeySize = 16 * 1024;
  if ((memoryUsage || 0) + Buffer.byteLength(eventData) > maxKeySize) {
    await redis.del(key);
  }
  await redis.rpush(key, eventData);
  return eventObject;
}

export async function getEvents(topic: string) {
  const key = getKey(topic);
  return (await redis.lrange(key, 0, -1)).map((event) => JSON.parse(event));
}

export async function getRedisStats() {
  const info = await redis.info();
  const dbsize = await redis.dbsize();
  
  const memorySection = info.split('\r\n').find(line => line.startsWith('used_memory_human:'));
  const uptimeSection = info.split('\r\n').find(line => line.startsWith('uptime_in_seconds:'));
  
  return {
    keyspace: {
      total_keys: dbsize,
    },
    memory: {
      used_memory_human: memorySection?.split(':')[1] || 'unknown',
    },
    redis_uptime_seconds: uptimeSection ? parseInt(uptimeSection.split(':')[1]) : 0,
  };
}

type EventPayloadMapping = Record<string, any>;

type Values<T extends EventPayloadMapping> = T[keyof T];

export type Event<TType extends string, TPayload> = {
  type: TType;
  payload: TPayload;
  timestamp: number;
};

export type EventObject<T extends EventPayloadMapping> = Values<{
  [K in keyof T & string]: Event<K, T[K]>;
}>;

/**
 * Represents a store for managing events of a specific topic.
 * Provides methods to add new events and retrieve existing ones.
 */
export class EventStore<T extends EventPayloadMapping> {
  constructor(public topic: string) {}

  /**
   * Retrieves all events for this store's topic.
   */
  get() {
    return getEvents(this.topic) as Promise<EventObject<T>[]>;
  }

  /**
   * Adds a new event to the store.
   * @returns A promise that resolves to the created event object.
   *  (Tip: If you are using View, you can pass the returned value to `handleEvent` to have the view process the event.)
   */
  add<K extends keyof T & string>(type: K, payload: T[K]) {
    return addEvent(this.topic, type, payload) as Promise<Event<K, T[K]>>;
  }
}

/**
 * An abstract base class for creating views that process and maintain state based on events.
 */
export abstract class View<T extends EventPayloadMapping> {
  /**
   * Handles an individual event. This method should be implemented by subclasses to define how each event affects the view's state.
   *
   * Tip: You can use the utility method `createEventHandler` to create an event handler function.
   */
  abstract handleEvent(event: EventObject<T>): void;

  /**
   * Creates an event handler function that dispatches events to the appropriate handler based on the event type.
   */
  protected createEventHandler(handlers: {
    [K in keyof T & string]: (event: Event<K, T[K]>) => void;
  }): (event: EventObject<T>) => void {
    return (event) => {
      const handler = handlers[event.type];
      if (handler) {
        handler(event);
      } else {
        throw new Error(`Unhandled event type: ${event.type}`);
      }
    };
  }

  /**
   * Loads and processes all events from an EventStore.
   * This method should be called to initialize or update the view's state.
   */
  async loadFrom(eventStore: EventStore<T>) {
    const events = await eventStore.get();
    for (const event of events) {
      this.handleEvent(event);
    }
    return this;
  }
}
