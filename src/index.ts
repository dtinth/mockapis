import cors from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia, type AnyElysia } from "elysia";
import { kio } from "./apis/dtinth/kio";
import { line } from "./apis/line/line";
import { openaiChat } from "./apis/openai/chat";
import { getEventLog } from "./eventLog";

let apiDescription = `**A set of mock APIs for testing.**

# Test endpoints

Endpoints that exist to facilitate testing, but aren’t otherwise present in the real API, are marked with \`_test\` in the path.

# How it works

When you use the mock APIs, the endpoints that you call may generate an event that you can later inspect.

For example, your app may call a ‘send SMS’ endpoint.
You can configure your app code to direct the request to the mock API instead of the real SMS provider when a test number is used.
Instead of sending a real message, the mock API will save the message to the event log.
Your tests can then use the ‘Get events’ endpoint to retrieve the stored events and verify if your app behaves correctly.

Note that the contents in the event log are deleted after a while, so only use these endpoints for short-term testing purposes.

# Caveats

These mock APIs are only designed for automated testing convenience only, particularly when writing end-to-end tests.
It may not accurately simulate the behavior of the real APIs.

For example, most APIs here only model the success case.
When they return an error, it is usually a generic error message that does not reflect the real error that would occur in the real API.
It also doesn’t validate the input data as strictly as the real API would.
Therefore, when integrating, you should always test your app with the real APIs, and only use these mock APIs to make writing automated end-to-end tests more convenient.

For higher testing fidelity, if you are able to obtain a sandbox account from the real API provider, you should use that instead of the mock APIs.
For testing specific API edge cases, you should also consider an approach where [requests to the real APIs are recorded on first test run and replayed on subsequent runs](https://github.com/vcr/vcr), if your test framework supports that kind of thing.

# Authentication

The mock APIs do not require authentication.

# CORS

The mock APIs are configured to allow CORS requests from any origin.
`;

if (Bun.env["DEMO_INSTANCE"]) {
  apiDescription += `

# About the demo instance

This demo instance is hosted on a free [Render](https://render.com/) instance.
It may be slow to respond due to the free tier limitations.
Feel free to use it, but keep in mind that (1) there is no uptime or reliability guarantee, and (2) the data is not protected and may be lost at any time.
If you need a more reliable instance, you can [take the source code](https://github.com/dtinth/mockapis) and run your own instance.`;
}

const apis = ([line, openaiChat, kio] as const).toSorted((a, b) =>
  a.tag.localeCompare(b.tag)
);

function applyApis<E extends AnyElysia>(elysia: E) {
  for (const api of apis) {
    elysia = elysia.use(api.elysia) as typeof elysia;
  }
  return elysia;
}

const app = applyApis(
  new Elysia()
    .use(cors())
    .use(
      swagger({
        documentation: {
          info: {
            title: "Mock APIs",
            description: apiDescription,
            version: "0.0.0",
          },
          tags: [
            {
              name: "Introspection",
              description: "Provides access to raw data in the event log.",
            },
            ...apis.map((api) => ({
              name: api.tag,
              description: api.description,
            })),
          ],
        },
      })
    )
    .get(
      "/_test/events/:topic",
      async ({ params }) => {
        console.log(params.topic);
        return getEventLog(params.topic);
      },
      {
        detail: {
          summary: "Get events",
          tags: ["Introspection"],
        },
      }
    )
)
  .get(
    "/",
    async () => {
      return new Response(null, {
        status: 302,
        headers: { Location: "/swagger" },
      });
    },
    { detail: { hide: true } }
  )
  .listen(+(Bun.env["PORT"] || 46982));

export type App = typeof app;

console.log(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
