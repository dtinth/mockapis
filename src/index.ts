import cors from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia, type AnyElysia } from "elysia";
import { dtinthKio } from "./apis/dtinth-kio";
import { eventpop } from "./apis/eventpop";
import { github } from "./apis/github";
import { line } from "./apis/line";
import { lineLogin } from "./apis/line-login";
import { oauth } from "./apis/oauth";
import { openai } from "./apis/openai";
import { vonage } from "./apis/vonage";
import { opnPayments } from "./apis/opnPayments";
import { smskub } from "./apis/smskub";

let apiDescription = `**A collection of mock API endpoints of various services,** designed to facilitate end-to-end testing development.
This project provides a set of simulated APIs that mimic the real services, allowing developers to test their applications without relying on actual external services.

The service provides **mock endpoints** and **test endpoints.**

- **Mock endpoints** are endpoints that simulate the behavior of the real service. They should be called from your application code.
- **Test endpoints** are endpoints that aren’t present in the real service, but are provided here to help you test your application. They should be called from your test code. These endpoint facilitates tasks such as setting up scenarios and verifying the state of the system.

Contributions for more APIs are welcome! Feel free to submit pull requests to [dtinth/mockapis](https://github.com/dtinth/mockapis).

# Example use case

Imagine you are developing an application that sends SMS messages through an SMS API provider, and you want to write end-to-end tests your app that verifies the SMS functionality. You can:

1. Configure your application code to send SMS messages through the mock SMS API instead of the real API when certain conditions are met (e.g. when the phone number matches a certain pattern). (Make sure to turn this off in production!)
2. Write your end-to-end tests, filling in the phone number with a test phone number. This should cause your application to send the SMS through the mock SMS API. Instead of sending a real SMS, the mock SMS API will temporarily store the SMS message in the database.
3. Call the test endpoint to retrieve the SMS messages sent to the test phone number, and verify that the SMS message was sent correctly.

# Caveats

## Limited fidelity

These mock APIs are only designed for automated testing convenience only, particularly when writing end-to-end tests.
It may not accurately simulate the behavior of the real APIs.

For example, most APIs here only model the success case.
When they return an error, it is usually a generic error message that does not reflect the real error that would occur in the real API.
It also doesn’t validate the input data as strictly as the real API would.
Therefore, when integrating, you should always test your app with the real APIs, and only use these mock APIs to make writing automated end-to-end tests more convenient.

Pull requests that improve the fidelity of the mock APIs are welcome. Submit them to [dtinth/mockapis](https://github.com/dtinth/mockapis).

For higher testing fidelity, if you are able to obtain a sandbox account from the real API provider, you should use that instead of the mock APIs.
For testing specific API edge cases, you should also consider an approach where [requests to the real APIs are recorded on first test run and replayed on subsequent runs](https://github.com/vcr/vcr), if your test framework supports that kind of thing.

## Data persistence

While the mock APIs are backed by a database (so that you can retrieve the data you have sent to the mock APIs),
it is designed for short-term storage only. After a while, the data will be deleted.

# Authentication

For most endpoints, the mock APIs do not require authentication. You can still provide an Authorization header with any value, but it will be ignored.

Some endpoints have a notion of a “current user.” For these endpoints, you can use the provided fake OAuth API to generate an access token to pass to the mock APIs.

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

const apis = [
  // Add new APIs here
  oauth,
  eventpop,
  github,
  openai,
  line,
  lineLogin,
  vonage,
  dtinthKio,
  opnPayments,
  smskub,
] as const;

const sortedApis = [...apis].sort((a, b) => a.tag.localeCompare(b.tag));

function applyApis<E extends AnyElysia>(elysia: E) {
  for (const api of sortedApis) {
    elysia = elysia.use(api.elysia) as typeof elysia;
  }
  return elysia;
}

const app = applyApis(
  new Elysia()
    .use(cors())
    .onAfterResponse((x) => {
      const { request, error } = x as {
        request: Request;
        error?: Error;
      };
      if (error instanceof Error) {
        console.error(`${request.method} ${request.url}:`, error);
      }
    })
    .use(
      swagger({
        documentation: {
          info: {
            title: "Mock APIs",
            description: apiDescription,
            version: "0.0.0",
          },
          tags: [
            ...apis.map((api) => ({
              name: api.tag,
              description: api.description,
            })),
          ],
        },
      })
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

console.log(`http://${app.server?.hostname}:${app.server?.port}`);
