import type { BunPlugin } from "bun"
import type { Plugin } from "vite"
import type { Router } from "./lib/router.js"
import type { Route } from "./lib/types/internal.js"

export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>
export type MaybePromise<T> = T | Promise<T>
export type RequestEvent = {
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  locals: { [key: string]: string },
  params: Params;
  request: Request;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
}
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>
export type XinkConfig = {
  params?: string;
  routes?: string;
}

export async function xink(xink_config?: XinkConfig): BunPlugin
export function html(data: any, init?: ResponseInit | undefined): Response
export function json(data: any, init?: ResponseInit | undefined): Response
export function text(data: string, init?: ResponseInit | undefined): Response
export function sequence(...handlers: Handle[]): Handle
export class Xink {
  constructor() {}
  async fetch(request: Request): Promise<Response>
}
