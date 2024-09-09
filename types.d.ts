import type { BunPlugin } from "bun"
import type { Router } from "./lib/router.js"
import type { Params, Route } from "./lib/types/internal.js"
import type { CookieSerializeOptions } from "cookie"

export type Cookies = {
  get(name: string, options?: CookieSerializeOptions): string | undefined;
  getAll(options?: CookieSerializeOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options: CookieSerializeOptions & { path?: string }): void;
}
export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>
export type MaybePromise<T> = T | Promise<T>
export type RequestEvent = {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  locals: { [key: string]: string },
  params: Params;
  request: Request;
  route: Route;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
}
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>
export type XinkConfig = {
  middleware?: string;
  params?: string;
  routes?: string;
}

export function xink(xink_config?: XinkConfig): BunPlugin
export function html(data: any, init?: ResponseInit | undefined): Response
export function json(data: any, init?: ResponseInit | undefined): Response
export function text(data: string, init?: ResponseInit | undefined): Response
export function sequence(...handlers: Handle[]): Handle
export class Xink {
  constructor() {}
  async fetch(request: Request): Promise<Response>
}
