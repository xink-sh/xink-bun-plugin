/** @import { RequestEvent } from "../types.js" */
/** @import { Cookie } from "./types/internal.js" */
import { resolve } from "./runtime/main.js"
import { addCookiesToHeaders, getCookies, initRouter } from "./runtime/internal.js"
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
    /** @type {Record<string, Cookie>} */
    let cookies_to_add ={}
    /** @type {Record<string, string>} */
    const headers = {}
    const url = new URL(request.url)
    const route = this.router.find(url.pathname)
    console.log('path', url.pathname)
    console.log('route', route)
    const handle = this.router.getMiddleware()
    const { cookies, new_cookies } = getCookies(request, url)

    cookies_to_add = new_cookies

    /**
     * @type {RequestEvent}
     */
    const event = {
      cookies,
      headers: request.headers,
      locals: {},
      params: route ? route.params : {},
      request,
      route,
      url,
    }

    const response = await handle(event, (event) =>
      resolve(event).then((response) => {
        for (const key in headers) {
          const value = headers[key]
          response.headers.set(key, value)
        }

        addCookiesToHeaders(response.headers, Object.values(cookies_to_add))

        return response
      }) 
    )
    return response
  }
}
