import type { AnyElysia } from "elysia";

export interface Api<E extends AnyElysia> {
  elysia: E;
  tag: string;
  description: string;
}

export function defineApi<E extends AnyElysia>(options: {
  tag: string;
  description: string;
  elysia: E;
}): Api<E> {
  return {
    elysia: options.elysia,
    tag: options.tag,
    description: options.description,
  };
}
