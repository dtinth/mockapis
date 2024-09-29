import createClient from "openapi-fetch";
import type { paths } from "./api.generated";

export const api = createClient<paths>({ baseUrl: "http://localhost:46982" });
