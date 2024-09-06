import { resolve } from "./utils/runtime.js"
import { buildRouter } from "./utils/build.js"
import { getContext } from "./context.js" with { type: 'macro' }

const context = getContext()
console.log('context', context)

export class Xink {
  constructor() {
    this.router
    this.init()
  }

  async init() {
    console.log("xink init'd")
    this.router = await buildRouter(context)
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
    const middleware = this.router.getMiddleware()

    const event = {
      headers: request.headers,
      locals: {},
      params: route ? route.params : {},
      request,
      route,
      url,
    }

    return middleware ? middleware(event, resolve) : resolve(event)
  }
}
