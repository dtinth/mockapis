import { expect, test } from "bun:test";
import { api } from "./test-utils";

test("sends SMS quick message", async () => {
  const tester = new SMSKUBTester();
  const to = [
    tester.generateThaiMobileNumber(),
    tester.generateThaiMobileNumber(),
  ];
  const from = "SmskubTester";
  const message = "Quick Message Test!";

  const result = await tester.sendSMSQuickMessage(to, from, message);
  expect(result).toMatchObject({
    balance: expect.any(Number),
    code: 200,
    data: {
      total: to.length,
      block: 0,
      send: to.length,
      used: 0,
      balance: expect.any(Number),
      type: expect.any(String),
      is_schedule: null,
      id: expect.any(String),
    },
    message: "Success",
  });

  for (const phone of to) {
    const messages = await tester.getMessages(phone);
    expect(messages).toEqual([
      {
        to,
        from,
        message,
      },
    ]);
  }
});

class SMSKUBTester {
  generateThaiMobileNumber(): string {
    const prefixes = ["06", "08", "09"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = Math.floor(
      10000000 + Math.random() * 90000000,
    ).toString();
    return `${randomPrefix}${randomSuffix}`;
  }

  async sendSMSQuickMessage(to: string[], from: string, message: string) {
    const { data } = await api.POST("/smskub/api/messages", {
      body: {
        to,
        from,
        message,
      },
    });
    return data;
  }

  async getMessages(to: string) {
    const { data } = await api.GET("/smskub/_test/messages", {
      params: { query: { to } },
    });
    return data;
  }
}
