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
