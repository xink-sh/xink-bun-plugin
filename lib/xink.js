import { resolve } from "./runtime/main.js"
import { initRouter } from "./runtime/internal.js"
import { getContext } from "./buildtime/macros.js" with { type: 'macro' }

const context = getContext()

export class Xink {
  constructor() {
    this.router
    this.#init()
  }

  async #init() {
    this.router = await initRouter(context)
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
      url,
    }

    return middleware ? middleware(event, resolve) : resolve(event)
  }
}
