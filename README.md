# Mock APIs

A collection of mock API endpoints designed to facilitate end-to-end testing development. This project provides a set of simulated APIs that mimic real-world services, allowing developers to test their applications without relying on actual external services.

The service provides **mock endpoints** and **test endpoints.**

- **Mock endpoints** are endpoints that simulate the behavior of the real service. They should be called from your application code.
- **Test endpoints** are endpoints that aren’t present in the real service, but are provided here to help you test your application. They should be called from your test code. These endpoint facilitates tasks such as setting up scenarios and verifying the state of the system.

Contributions for more APIs are welcome!

## API list

<!-- begin api list -->

<!-- prettier-ignore -->
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;API&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description |
| --- | --- |
| [**OAuth 2.0 / OIDC**](https://mockapis.onrender.com/swagger#tag/oauth-20--oidc) | A mock OAuth 2.0 and OpenID Connect provider API that lets users authenticate as anyone they wish. |
| [**Eventpop**](https://mockapis.onrender.com/swagger#tag/eventpop) | A mock API that implements a subset of the [Eventpop Public API](https://docs.eventpop.me/). |
| [**GitHub**](https://mockapis.onrender.com/swagger#tag/github) | A mock API that implements a subset of the [GitHub API](https://docs.github.com/en/rest). |
| [**OpenAI**](https://mockapis.onrender.com/swagger#tag/openai) | A mock API that implements a subset of the [OpenAI API](https://beta.openai.com/docs/api-reference/chat). |
| [**LINE**](https://mockapis.onrender.com/swagger#tag/line) | A mock API that implements a subset of the [LINE Messaging API](https://developers.line.biz/en/reference/messaging-api/). |
| [**Vonage**](https://mockapis.onrender.com/swagger#tag/vonage) | A mock API that implements a subset of the [Vonage SMS API](https://developer.vonage.com/en/api/sms) for sending SMS messages. |
| [**dtinth/kio**](https://mockapis.onrender.com/swagger#tag/dtinthkio) | A mock API that implements the endpoints expected by [dtinth/kio](https://github.com/dtinth/kio), a geeky self-checkin kiosk. |

<!-- end api list -->

## Example use case

Imagine you are developing an application that sends SMS messages through an SMS API provider, and you want to write end-to-end tests your app that verifies the SMS functionality. You can:

1. Configure your application code to send SMS messages through the mock SMS API instead of the real API when certain conditions are met (e.g. when the phone number matches a certain pattern). (Make sure to turn this off in production!)
2. Write your end-to-end tests, filling in the phone number with a test phone number. This should cause your application to send the SMS through the mock SMS API. Instead of sending a real SMS, the mock SMS API will temporarily store the SMS message in the database.
3. Call the test endpoint to retrieve the SMS messages sent to the test phone number, and verify that the SMS message was sent correctly.

## Demo

You can explore the available APIs and their documentation at our demo instance:

<https://mockapis.onrender.com/>

## Running with Docker

We provide a docker-compose configuration for users who would like to run the service locally without any configuration. This is useful if you have limitation connecting to external network during testing.

```sh
docker compose up -d
```

## Features

- Multiple mock API endpoints simulating various services without the need for authentication or API keys (any key is accepted)
- CORS support for cross-origin requests
- Testing endpoints for verifying that your app calls the correct APIs

## Getting Started

To run the project locally:

1. Clone the repository
2. Install dependencies with `bun install`
3. Start the development server with `bun dev`

The server will start, and you can access the Swagger UI at `http://localhost:46982`.

## Contributing

We welcome contributions to expand and improve the Mock APIs project! Here are some ways you can contribute:

1. Add new mock API endpoints
2. Improve existing API simulations
3. Enhance documentation
4. Fix bugs or improve performance
5. Improve test coverage

## Running Tests

To run the test suite, first run the dev server, and then run the following command:

```bash
bun generate:types  # Generate types from OpenAPI specs
bun test            # Run the tests
```

## Architecture Overview

The Mock APIs project is built using [Elysia](https://elysiajs.com/), a TypeScript web framework, and uses Redis as an event store. The architecture is designed to be modular and easily extensible.

Key components:

- Elysia for API routing and handling
- Redis for storing events
- `EventStore` and `View` utilities for managing state
- [openapi-typescript](https://openapi-ts.dev/cli) for generating TypeScript types from OpenAPI specs for testing
- Tester pattern for writing tests

## Adding New APIs

To add a new API:

1. Create a new file in the `src/apis` directory (e.g., `newapi.ts`).
2. Define your API using Elysia, including routes and handlers. See existing APIs for examples.
3. Use the `defineApi` function to export your API:
4. Import and add your new API to the `apis` array in `src/index.ts`.

## Using EventStore and View

The `EventStore` and `View` utilities help manage state:

- `EventStore`: Handles storing and retrieving events from Redis.
- `View`: Helps build a state representation from events.

Example usage:

```typescript
interface Events {
  someEvent: { data: string };
}

class MyView extends View<Events> {
  someState: string = "";

  handleEvent = this.createEventHandler({
    someEvent: (event) => {
      this.someState = event.payload.data;
    },
  });
}

// In your API handler:
const eventStore = new EventStore<Events>("my-topic");
const view = new MyView().loadFrom(eventStore);
```

## Adding Tests

Tests are written using Bun's test runner. To add tests for a new API:

1. Create a new test file in the `tests` directory (e.g., `newapi.test.ts`).
2. Use the tester pattern to create a class that encapsulates API calls.
3. Write tests using the tester class to interact with your API.

## Tester Pattern

The tester pattern involves creating a class that wraps API calls and provides methods for interacting with your API. This approach:

- Encapsulates API interaction logic
- Generates unique identifiers for each test run to keep state isolated
- Makes tests more readable and maintainable
- Allows for easy reuse of common API interactions across multiple tests

Example:

```typescript
test("my api test", async () => {
  const tester = new MyApiTester();
  await tester.doSomething("test");
  const state = await tester.getInfo();
  expect(state).toMatchObject({
    /* expected state */
  });
});

class MyApiTester {
  async doSomething(param: string) {
    const { data } = await api.POST("/my/api/endpoint", {
      body: { param },
    });
    return data;
  }

  async getInfo() {
    const { data } = await api.GET("/my/api/info");
    return data;
  }
}
```
