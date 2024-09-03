# xink-bun-plugin

A bun plugin for the Xink API router. In early development.

## Use

```ts
/* index.ts */
import { Xink } from "@xink-sh/xink-bun-plugin"

const api = new Xink()

Bun.serve({
  fetch(req) {
    return api.fetch(req)
  }
})
```