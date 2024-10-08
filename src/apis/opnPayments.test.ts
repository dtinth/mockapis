import { expect, test } from "bun:test"
import { api } from "./test-utils"

test("create charge", async () => {
  const tester = new OpnPaymentsTester()

  const amount = 300000
  const currency = "thb"
  const card = "tokn_test_abc1234567890"
  const return_uri = "http://localhost:5173/payment/return_uri"

  const result = await tester.createCharge(amount, currency, card, return_uri)
  expect(result).toMatchObject({
    object: "charge",
    id: `chrg_test_${card.split("_").pop()}`,
    amount: amount,
    currency: currency,
    return_uri: return_uri,
    description: "lorem ipsum",
    status: "pending",
    authorized: false,
    paid: false,
  })
})

class OpnPaymentsTester {
  async createCharge(
    amount: number,
    currency: string,
    card: string,
    return_uri: string
  ) {
    const { data } = await api.POST("/opn-payments/charges", {
      body: {
        amount: String(amount),
        currency,
        card,
        return_uri,
        header: {
          authorization: "Basic " + btoa("skey_dummy" + ":"),
        },
      },
    })
    return data
  }
}
