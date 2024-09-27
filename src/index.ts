import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";

const app = new Elysia()
  .use(swagger())
  .get("/", () => "Hello Elysia")
  .listen(+(Bun.env["PORT"] || 46982));

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
