import { ofetch } from "ofetch";
import createClient from "openapi-fetch";
import type { paths } from "./api.generated";

export const baseUrl = "http://localhost:46982";
export const api = createClient<paths>({ baseUrl: baseUrl });
export const apiFetch = ofetch.create({ baseURL: baseUrl });
export type { paths };

export async function makeAuthorizationCode(claims: any) {
  const res = await api.POST("/oauth/_test/code", { body: { claims } });
  return res.data!.code;
}
