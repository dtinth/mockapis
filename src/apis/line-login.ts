import { Elysia, redirect } from "elysia";
import { defineApi } from "../defineApi";

const elysia = new Elysia({ prefix: "/line-login", tags: ["LINE Login"] })
  .get("/oauth2/v2.1/authorize", ({ request }) => {
    return redirect(
      `/oauth/protocol/openid-connect/auth?${new URL(request.url).searchParams}`
    );
  })

export const lineLogin = defineApi({
  tag: "LINE Login",
  description: `A mock API that implements LINE Login authorization endpoints corresponding to access.line.me.
  
- The authorize endpoint redirects to the standard OAuth authorize page.
- This API mimics LINE Login's OAuth 2.0 authorization flow by leveraging the existing OAuth infrastructure.`,
  elysia,
});