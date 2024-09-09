/** @import { Cookies } from "../../types.js" */
/** @import { CookieParseOptions, CookieSerializeOptions } from "cookie" */
import { parse, serialize } from "cookie"
import { ALLOWED_HANDLERS } from "../constants.js"
import { Router } from "../router.js"

const cwd = process.cwd()

/**
 * Based on SvelteKit's implementation of cookies.
 * 
 * @param {Request} request 
 * @param {URL} url
 */
export const getCookies = (request, url) => {
  const MAX_COOKIE_SIZE = 4129;
  const header = request.headers.get('cookie') ?? ''

  /* Do not decode yet. Simply return values. */
  const raw = parse(header, { decode: value => value })

  const defaults = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: url.hostname === 'localhost' && url.protocol === 'http' ? false : true
  }

  const new_cookies = {}

  /**
   * @type {Cookies}
   */
  const cookies = {
    /**
     * 
     * @param {string} name 
     * @param {CookieParseOptions} options 
     */
    get(name, options) {
      const c = new_cookies[name]

      if (
        c &&
        domainMatches(url.hostname, c.options.domain) &&
        pathMatches(url.pathname, c.options.path)
      ) {
        return c.value
      }

      const decoder = options?.decode || decodeURIComponent
      const request_cookies = parse(header, { decode: decoder })
      const cookie = request_cookies[name]

      return cookie
    },

    /**
     * 
     * @param {string} name 
     * @param {string} value 
     * @param {CookieSerializeOptions} options 
     */
    set(name, value, options) {
      setInternal(name, value, { ...defaults, ...options })
    }
  }

  function setInternal(name, value, options) {
		let path = options.path;

		// if (!options.domain || options.domain === url.hostname) {
		// 	path = resolve(normalized_url, path);
		// }

		new_cookies[name] = { name, value, options: { ...options, path } };

		//if (__SVELTEKIT_DEV__) {
    if (true) {
			const serialized = serialize(name, value, new_cookies[name].options);
			if (new TextEncoder().encode(serialized).byteLength > MAX_COOKIE_SIZE) {
				throw new Error(`Cookie "${name}" is too large, and will be discarded by the browser`);
			}
		}
	}

  return cookies
}

export const initRouter = async (context) => {
  const { mode } = context
  
  const router = new Router()
  const manifest = await import(`${mode === 'dev' ? `${cwd}/.xink` : cwd}/manifest.json`, { with: { type: 'json'} })
  console.log('build routes', manifest)

  /* Register params. */
  for (let [k, v] of Object.entries(manifest.params)) {
    const matcher = (await import(`${cwd}/${v}`)).match ?? null
    if (matcher) router.setMatcher(k, matcher)
  }

  /* Register middleware. */
  if (manifest.middleware) {
    const handle = (await import(`${cwd}/${manifest.middleware}`)).handle ?? null
    if (handle) router.setMiddleware(handle)
  }

  /* Register routes. */
  for (let [k, v] of Object.entries(manifest.routes)) {
    if (k === 'default')
      continue
    console.log('processing route', v)
    const module = await import(`${cwd}/${v.file}`)
    console.log('route module', module)
    const handlers = Object.entries(module)
    const store = router.register(v.path)

    console.log('Processing handlers...')
    handlers.forEach(([verb, handler]) => {
      console.log('Processed handler', verb, ':', typeof verb)
      if (typeof handler !== 'function')
        throw new Error(`Handler ${verb} for route ${v.path} is not a function.`)
      if (!ALLOWED_HANDLERS.has(verb))
        throw new Error(`xink does not support the ${verb} endpoint handler, found in ${v.file}`)

      store[verb] = handler
    })
    console.log('Store is', store)
  }

  return router
}

/**
 * 
 * @param {string} hostname 
 * @param {string} matcher 
 */
function domainMatches(hostname, matcher) {
  /**
   * Normalize the matcher domain, per https://datatracker.ietf.org/doc/html/rfc6265#section-5.2.3
   */
  const normalized = matcher[0] === '.' ? matcher.slice(1) : matcher

  /* Exact match. */
  if (hostname === normalized) return true

  /* Test by excluding subdomain(s). */
  return hostname.endsWith('.' + normalized)
}

/**
 * 
 * @param {string} path 
 * @param {string} matcher 
 */
function pathMatches(path, matcher) {
  /**
   * Normalize the matcher path by removing any trailing slash.
   */
  const normalized = matcher.endsWith('/') ? matcher.slice(0, -1) : matcher

  /* Exact match. */
  if (path === normalized) return true

  /* Test by excluding URL hash property (#), which is percent-encoded and preserved for URL pathname. */
  return path.startsWith(normalized + '/')
}