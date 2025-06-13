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
| [**LINE**](https://mockapis.onrender.com/swagger#tag/line) | A mock API that implements a subset of the [LINE Messaging API](https://developers.line.biz/en/reference/messaging-api/) and [LINE Login API](https://developers.line.biz/en/reference/line-login/). |
| [**Vonage**](https://mockapis.onrender.com/swagger#tag/vonage) | A mock API that implements a subset of the [Vonage SMS API](https://developer.vonage.com/en/api/sms) for sending SMS messages. |
| [**dtinth/kio**](https://mockapis.onrender.com/swagger#tag/dtinthkio) | A mock API that implements the endpoints expected by [dtinth/kio](https://github.com/dtinth/kio), a geeky self-checkin kiosk. |
| [**OpnPayments**](https://mockapis.onrender.com/swagger#tag/opnpayments) | A mock API that implements a subset of the [OpnPayments API](https://docs.opn.ooo) for receiving payments. |
| [**SMSKUB**](https://mockapis.onrender.com/swagger#tag/smskub) | A mock API that implements a subset of the [SMSKUB API](https://documenter.getpostman.com/view/9887776/VV4xvFoy#6cfa0c23-5f08-4f80-9e62-ffbf10dd75ea) for sending SMS quick messages. |

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

### Using Pre-built Image

For quick setup without building from source, you can use the pre-built Docker image. Create a `docker-compose.yml` file with the following content:

```yaml
services:
  redis:
    image: "redis:latest"
  mockapis:
    image: ghcr.io/dtinth/mockapis:main
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    ports:
      - "46982:46982"
```

Then run:

```sh
docker compose up -d
```

This will start the Mock APIs service using the latest pre-built image from the GitHub Container Registry.

### Building from Source

If you plan to make changes to the Mock APIs or want to build from source, you can use the `docker-compose.yml` file provided in the repository. Clone the repository and run:

```sh
docker compose up -d
```

This will build the Docker image from the source code in the repository and start the service.

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

## Development Guidelines

To maintain code quality and avoid common mistakes, please follow these guidelines when contributing:

### 0. Feedback-Driven Documentation Improvement

**When you receive feedback about code mistakes, always follow this pattern:**

1. **Fix the immediate issue** - Address the specific problem mentioned in the feedback
2. **Identify the root cause** - Ask: "Was this mistake caused by a gap in available information or documentation?"
3. **Update documentation** - Add guidelines to prevent future developers from making the same mistake
4. **Capture the learning** - Update documentation with the lesson learned

**Why this matters:** Mistakes often stem from missing or unclear documentation. By turning feedback into documentation improvements, we create a continuous improvement cycle that benefits everyone.

### 1. Follow Existing Patterns

**Before implementing new features**, always study existing implementations first:

- For OAuth flows, see `src/apis/eventpop.ts` as the reference pattern
- For API structure, examine similar APIs in the `src/apis/` directory
- For testing approaches, review existing test files

**Common mistake**: Overengineering solutions instead of following established patterns. For example, OAuth authorize endpoints should typically just redirect to the existing OAuth infrastructure rather than creating custom HTML pages.

```typescript
// ✅ Good - Follow the eventpop.ts pattern
.get("/oauth/authorize", ({ request }) => {
  return redirect(
    `/oauth/protocol/openid-connect/auth?${new URL(request.url).searchParams}`
  );
})

// ❌ Bad - Overengineering with custom HTML generation
.get("/oauth/authorize", () => {
  return generateComplexAuthorizePage(/* ... */);
})
```

### 2. Use Proper Testing Utilities

Always use the configured testing utilities from `src/apis/test-utils/`:

- Use `api` for typed API calls
- Use `apiFetch` for raw HTTP requests (e.g., when testing redirects or HTML endpoints)
- Use `makeAuthorizationCode()` for generating OAuth test codes

**Common mistake**: Using raw `fetch` instead of the configured utilities.

```typescript
// ✅ Good - Use configured utilities
import { api, apiFetch } from "./test-utils";

// For JSON API calls
const { data } = await api.GET("/my/endpoint");

// For raw HTTP (redirects, HTML)
const response = await apiFetch.raw("/my/endpoint", { redirect: "manual" });

// ❌ Bad - Using raw fetch
const response = await fetch("/my/endpoint");
```

### 3. Avoid Code Duplication

Before creating new functions or components:

1. Search the codebase for similar functionality
2. Consider extracting common patterns into reusable utilities
3. Check if existing functions can be parameterized instead of duplicated

**Common mistake**: Creating duplicate HTML generation or similar logic without checking for existing implementations.

### 4. Write Clean, Focused Tests

Follow these principles for maintainable test code:

#### Test Architecture Pattern

Tests should follow this layered architecture:
**Test → Tester → api/apiFetch → services**

- **Tests** should be concise and focus on the behavior being tested
- **Tester classes** encapsulate all API interactions and provide semantic methods
- **api/apiFetch** utilities handle HTTP communication
- **Services** contain the actual business logic

#### Rule: Tests Should Not Make Direct API Calls

Tests should never call `api`, `apiFetch`, or other HTTP utilities directly. Instead, they should use methods from Tester classes.

```typescript
// ✅ Good - Using Tester methods
test("LINE Login token exchange", async () => {
  const tester = new LineTester();
  const code = tester.getLineLoginAuthorizeCode({ sub: "user123" });
  const result = await tester.exchangeLineLoginCode(code, { 
    client_id: "test_client" 
  });
  expect(result.access_token).toBeDefined();
});

// ❌ Bad - Direct API calls in tests  
test("LINE Login token exchange", async () => {
  const authResponse = await api.POST("/oauth/protocol/openid-connect/token", {
    body: { grant_type: "authorization_code", code: "test" }
  });
  const tokenResponse = await api.POST("/line/oauth2/v2.1/token", {
    body: { grant_type: "authorization_code", code: authResponse.code }
  });
  expect(tokenResponse.access_token).toBeDefined();
});
```

#### Keep Tests Concise

- Each test should focus on one specific behavior
- Use descriptive Tester method names that clearly indicate what they do
- If a test is getting long, extract the setup logic into Tester methods

```typescript
// ✅ Good - Concise test using semantic methods
test("can send message to user", async () => {
  const tester = new LineTester();
  await tester.sendMessage("user123", "Hello!");
  const messages = await tester.getReceivedMessages("user123");
  expect(messages).toHaveLength(1);
  expect(messages[0].text).toBe("Hello!");
});

// ❌ Bad - Long test with implementation details
test("can send message to user", async () => {
  const userId = `user_${Math.random()}`;
  const channelId = `channel_${Math.random()}`;
  
  // Setup channel
  await api.POST("/line/test/channels", {
    body: { channelId, accessToken: "test_token" }
  });
  
  // Send message
  await api.POST("/line/v2/bot/message/push", {
    body: {
      to: userId,
      messages: [{ type: "text", text: "Hello!" }]
    },
    headers: { Authorization: `Bearer test_token` }
  });
  
  // Verify message
  const { data } = await api.GET(`/line/test/messages/${userId}`);
  expect(data.messages).toHaveLength(1);
  expect(data.messages[0].text).toBe("Hello!");
});
```

### 5. Test HTTP Responses Correctly

When testing endpoints that return different content types:

- Use `api.GET()` for JSON responses
- Use `apiFetch.raw()` with `redirect: "manual"` for redirect responses
- Use `apiFetch()` for HTML or other non-JSON responses

```typescript
// ✅ Good - Testing redirects
const response = await apiFetch.raw(url, { redirect: "manual" });
expect(response.status).toBe(302);

// ❌ Bad - Using JSON client for HTML endpoints
const { data } = await api.GET("/html/endpoint"); // Will fail with JSON parsing error
```

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
- Enforces the proper architecture: Test → Tester → api/apiFetch → services

### Tester Class Structure

A well-structured Tester class should:

1. **Provide semantic methods** that describe what the action does, not how it's implemented
2. **Handle all HTTP communication** so tests never call API utilities directly
3. **Generate unique identifiers** for test isolation
4. **Encapsulate complex multi-step operations** into single method calls
5. **Return only the data needed** by tests, not raw HTTP responses

### Example: Good Tester Implementation

```typescript
class LineTester {
  private testId = Math.random().toString(36).substring(7);
  
  // Semantic method names that describe the business action
  async sendMessage(userId: string, text: string) {
    const channelId = `test_channel_${this.testId}`;
    await this.setupChannel(channelId);
    
    const { data } = await api.POST("/line/v2/bot/message/push", {
      body: {
        to: userId,
        messages: [{ type: "text", text }]
      },
      headers: { Authorization: `Bearer ${channelId}_token` }
    });
    return data;
  }
  
  async getReceivedMessages(userId: string) {
    const { data } = await api.GET(`/line/test/messages/${userId}`);
    return data.messages; // Return only what tests need
  }
  
  // Encapsulate OAuth test code generation
  getLineLoginAuthorizeCode(claims: { sub: string }) {
    return makeAuthorizationCode({
      subject: claims.sub,
      issuer: "https://access.line.me",
      audience: "test_client"
    });
  }
  
  // Encapsulate token exchange flow
  async exchangeLineLoginCode(code: string, params: { client_id: string }) {
    const { data } = await api.POST("/line/oauth2/v2.1/token", {
      body: {
        grant_type: "authorization_code",
        code,
        client_id: params.client_id
      }
    });
    return data;
  }
  
  // Private helper methods for complex setup
  private async setupChannel(channelId: string) {
    await api.POST("/line/test/channels", {
      body: { channelId, accessToken: `${channelId}_token` }
    });
  }
}

// Clean, focused tests using the Tester
test("can send message to user", async () => {
  const tester = new LineTester();
  await tester.sendMessage("user123", "Hello!");
  const messages = await tester.getReceivedMessages("user123");
  expect(messages).toHaveLength(1);
  expect(messages[0].text).toBe("Hello!");
});

test("LINE Login token exchange", async () => {
  const tester = new LineTester();
  const code = tester.getLineLoginAuthorizeCode({ sub: "user123" });
  const result = await tester.exchangeLineLoginCode(code, { 
    client_id: "test_client" 
  });
  expect(result.access_token).toBeDefined();
});
```

### Common Tester Anti-Patterns to Avoid

```typescript
// ❌ Bad - Generic method names that don't describe the business action
class BadTester {
  async callEndpoint(url: string, body: any) { /* ... */ }
  async makeRequest(method: string, url: string) { /* ... */ }
}

// ❌ Bad - Exposing HTTP details to tests
class BadTester {
  async sendMessage(userId: string, text: string) {
    // Returns raw HTTP response instead of just the data
    return await api.POST("/line/v2/bot/message/push", { /* ... */ });
  }
}

// ❌ Bad - Not handling test isolation
class BadTester {
  async sendMessage(userId: string, text: string) {
    // Uses hardcoded values that will conflict between tests
    await api.POST("/line/test/channels", {
      body: { channelId: "fixed_channel" }
    });
  }
}
```
