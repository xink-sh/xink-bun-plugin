# xink-bun-plugin

A bun plugin for the Xink API router; in early development. The current API may change, or this plugin may be abandoned.

The hope of a plugin is that it will enable developers to run Xink in edge runtimes that don't have access to filesystem APIs.

## Current Limitations

- only tested with Ubuntu on Windows WSL
- there is no published package yet, so you'd need to clone this repo and use `bun link` to add it to your test api

## Route Types

Largely based on code from the [Medley](https://github.com/medleyjs/router) URL router, Xink supports the following route types:

- from Medley
  - static: /hello/there/world
  - dynamic: /hello/[name]
  - specific: /hello/miss-[name]
  - trailing rest: /hello/[...rest]
- Added by Xink:
  - matcher: /hello/[name=string] (where 'string' references a function, which tests if the value of the `name` parameter matches)

> The [[optional]] route feature is planned. We may consider allowing [...rest] to be in the middle of a route.

## Additional Features

- CSRF protection: checks content type and origin ([ref](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#disallowing-simple-content-types)).
- etag helper: returns 304 with no body, instead of 200 with body, if request etag equals response etag.

## Setup

I still need to experiment with just using bun as a dev dependency - if that's even possible for this use-case. For now, I've globally installed bun.

There will eventually be a one-liner that helps do the below three steps for you. These three files should be created in the root of your project.

1. A bun.build.ts file.
    ```ts
    import { xink } from '@xink-sh/xink-bun-plugin'

    await Bun.build({
      entrypoints: ['./index.ts'],
      outdir: 'out',
      plugins: [xink()]
    })
    ```
2. A bun.plugin.ts file.
    ```ts
    import { plugin } from 'bun'
    import { xink } from '@xink-sh/xink-bun-plugin'

    await plugin(xink())
    ```
3. A bunfig.toml file. This is needed for using the plugin during `bun run dev`.
    ```toml
    preload = ["./bun.plugin.ts"]
    ```
4. In your package.json file, create these scripts.
    ```json
    "scripts": {
      "dev": "bun --watch index.ts",
      "build": "bun bun.build.ts"
    }
    ```

## Create Routes

By default, routes should be created in `src/routes`. Each folder under this path represents a route segment.

At the end of a route segment, a `route.ts` file should export one or more functions for each HTTP method it will serve. You can also define a `fallback`, for any unhandled request methods.

Xink supports these verbs and function names: 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'

```ts
/* src/routes/article/[slug]/route.ts */
import { json, text, type RequestEvent } from '@xink-sh/xink-bun-plugin'

export const GET = async ({ params }: RequestEvent) => {
  const article = await getArticle(params.slug)

  return text(`Here is the ${article.title} post!`)
}

export const POST = async ({ req }: RequestEvent) => {
  return json(await req.json())
}

export const fallback = ({ req }: RequestEvent) => {
  return text(`Hello ${req.method}`)
}
```

## Cookie Handling

Xink provides `event.cookies` inside of your route handlers, with methods `delete`, `get`, `getAll`, and `set`.

```ts
/* src/routes/route.ts */

export const GET = ({ cookies }: RequestEvent) => {
  cookies.set('xink', 'cookie value', { maxAge: 60 * 60 * 24 * 365 })
  const cookie_value = cookies.get('xink')
  const all_cookies = cookies.getAll()
  cookies.delete('xink')
}
```

## Use

In your project root, create an `index.ts` file that uses the xink plugin.

```ts
/* index.ts */
import { Xink } from '@xink-sh/xink-bun-plugin'

const api = new Xink()

Bun.serve({
  fetch(req) {
    return api.fetch(req)
  }
})
```

## Parameter Matchers

You can validate route params by creating ts files in `src/params`. The file needs to export a `match` function that takes in a string and returns a boolean. When `true` is returned, the param matches and the router either continues to try and match the rest of the route or returns the route if this is the last segment. Returning `false` indicates the param does not match, and the router keeps searching for a route.

```ts
/* src/params/fruit.ts */
export const match = (param: string) => {
  const fruits = new Set(['apple', 'orange', 'grape'])
  return fruits.has(param)
} 
```

The above would be used in your route segment like so: `/src/routes/[fruits=fruit]`, where the right-side name should equal the filename (minus the extension) in `src/params`.

Xink provides the following built-in matchers, but they can be overridden by creating your own file definitions:

```ts
/* string */
(param) => /^[a-zA-Z]+$/.test(param)
```
```ts
/* number */
(param) => /^[0-9]+$/.test(param)
```

## Helper Functions

### html
Returns an html response. It sends a `Content-Length` header and a `Content-Type` header of `text/html`.
```ts
import { html } from '@xink-sh/xink-bun-plugin'

export const GET = (event) => { 
  return html(`<div>You chose ${event.params.fruits}</div>`)
}
```

### text
Returns a text response. By default, it sends a `Content-Length` header and a `Content-Type` header of `text/plain`.
```ts
import { text } from '@xink-sh/xink-bun-plugin'

export const GET = () => {
  return text(`Hello World!`)
}
```

### json
Returns a json response. By default, it sends a `Content-Length` header and a `Content-Type` header of `application/json`.
```ts
import { json } from '@xink-sh/xink-bun-plugin'

export const GET = () => {
  return json({ hello: world })
}
```

### redirect
Returns a redirect response.
```ts
import { redirect } from '@xink-sh/xink-bun-plugin'

export const GET = () => {
  return redirect(status: number, location: string)
}
```

## Plugin Configuration

Customize the configuration. Defaults are shown below.

Because of the current Bun plugin system, and needing to use the plugin during development and buildtime, a custom configuration is needed in both `bunfig.toml` and `bun.build.ts`.

```ts
type XinkConfig = {
  middleware?: string; //path where your middleware is defined.
  params?: string; // path where param matchers are defined.
  routes?: string; // path where routes are defined.
}

xink({
  middleware: 'src',
  params: 'src/params',
  routes: 'src/routes'
}: XinkConfig)
```

## Types

> `RequestEvent.route` is largely used internally, and not currently useful to developers.

```ts
type Cookies = {
  delete(name: string, options?: CookieSerializeOptions): void;
  get(name: string, options?: CookieParseOptions): string | undefined;
  getAll(options?: CookieParseOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options?: CookieSerializeOptions): void;
}
type Params = { [key: string]: string };
type Route = { store: Store; params: Params; } | null;

type RequestEvent = {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  locals: { [key: string]: string },
  params: Params;
  request: Request;
  route: Route;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
}
```

## Attributions
Xink stands on the shoulders of giants. A special shoutout and tip of the hat goes to [Medley router](https://github.com/medleyjs/router) and [SvelteKit](https://github.com/sveltejs/kit). It wasn't feasible to use their libraries within Xink. Therefore, I've used their code, exact or tweaked, in various places, and given short attributions.

## Origins
Pronounced "zinc", the name is based on the Georgian word [khinkali](https://en.wikipedia.org/wiki/Khinkali); which is a type of dumpling in the country of Georgia. The transcription is /ˈxink'ali/. To be clear: khinkali's beginning proununciation is dissimilar from "zinc".
