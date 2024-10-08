import type { BunPlugin } from "bun"
import type { Router } from "./lib/router.js"
import type { Params, Route } from "./lib/types/internal.js"
import type { CookieSerializeOptions } from "cookie"

export type Cookies = {
  delete(name: string, options?: CookieSerializeOptions): void;
  get(name: string, options?: CookieParseOptions): string | undefined;
  getAll(options?: CookieParseOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options?: CookieSerializeOptions): void;
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
export function redirect(status: number, location: string): never
export function text(data: string, init?: ResponseInit | undefined): Response
export function sequence(...handlers: Handle[]): Handle
export class Xink {
  constructor() {}
  async fetch(request: Request): Promise<Response>
}
