import { resolve } from "./utils/runtime.js"
import { buildRouter } from "./utils/build.js"
import { getContext } from "./context.js" with { type: 'macro' }

const context = getContext()

export class Xink {
  constructor() {
    this.router
    this.mode = context.mode ?? 'dev'
    this.init()
  }

  async init() {
    console.log("xink init'd")
    this.router = await buildRouter(this.mode)
  }

  /**
   *
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    const url = new URL(request.url)
    const route = this.router.find(url.pathname)
    console.log('route', route)
    const handle = this.router.getMiddleware()

    const event = {
      headers: request.headers,
      locals: {},
      params: route ? route.params : {},
      request,
      route,
      url,
    }

    return handle ? handle(event, resolve) : resolve(event)
  }
}
