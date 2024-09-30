import { expect, test } from "bun:test";
import { api } from "./test-utils";

test("sends SMS message", async () => {
  const tester = new VonageTester();
  const to = tester.generatePhoneNumber();
  const from = "TESTER";
  const text = "Hello, world!";

  const result = await tester.sendSMS(to, from, text);
  expect(result).toMatchObject({
    "message-count": "1",
    messages: [
      {
        to,
        status: "0",
        "remaining-balance": expect.any(String),
        "message-price": expect.any(String),
        network: expect.any(String),
      },
    ],
  });

  const messages = await tester.getMessages(to);
  expect(messages).toEqual([
    {
      to,
      from,
      text,
    },
  ]);
});

class VonageTester {
  generatePhoneNumber() {
    return "+1" + Date.now() + Math.random().toString().slice(2, 8);
  }

  async sendSMS(to: string, from: string, text: string) {
    const { data } = await api.POST("/vonage/sms/json", {
      body: {
        api_key: "test_key",
        api_secret: "test_secret",
        to,
        from,
        text,
      },
    });
    return data;
  }

  async getMessages(to: string) {
    const { data } = await api.GET("/vonage/_test/messages", {
      params: { query: { to } },
    });
    return data;
  }
}
