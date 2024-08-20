import { resolve } from "./utils/runtime.js"
import { router } from "./utils/router.js"

export class Xink {
  constructor() {
    this.router = router
  }

  /**
   *
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    const url = new URL(request.url)
    const route = this.router.find(url.pathname)
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
