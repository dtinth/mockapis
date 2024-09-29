# Mock APIs

A collection of mock API endpoints designed to facilitate end-to-end testing development. This project provides a set of simulated APIs that mimic real-world services, allowing developers to test their applications without relying on actual external services.

The service provides **mock endpoints** and **test endpoints.**

- **Mock endpoints** are endpoints that simulate the behavior of the real service. They should be called from your application code.
- **Test endpoints** are endpoints that aren’t present in the real service, but are provided here to help you test your application. They should be called from your test code. These endpoint facilitates tasks such as setting up scenarios and verifying the state of the system.

Contributions for more APIs are welcome!

## Example use case

Imagine you are developing an application that sends SMS messages through an SMS API provider, and you want to write end-to-end tests your app that verifies the SMS functionality. You can:

1. Configure your application code to send SMS messages through the mock SMS API instead of the real API when certain conditions are met (e.g. when the phone number matches a certain pattern). (Make sure to turn this off in production!)
2. Write your end-to-end tests, filling in the phone number with a test phone number. This should cause your application to send the SMS through the mock SMS API. Instead of sending a real SMS, the mock SMS API will temporarily store the SMS message in the database.
3. Call the test endpoint to retrieve the SMS messages sent to the test phone number, and verify that the SMS message was sent correctly.

## Demo

You can explore the available APIs and their documentation at our demo instance:

<https://mockapis.onrender.com/>

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

## Running Tests

To run the test suite, first run the dev server, and then run the following command:

```bash
bun generate:types  # Generate types from OpenAPI specs
bun test            # Run the tests
```
