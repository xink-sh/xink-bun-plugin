/** @import { DefaultConfig } from './types/internal.js' */

/**
 * @type {DefaultConfig}
 */
export const CONFIG = {
  middleware: 'src',
  params: 'src/params',
  routes: 'src/routes'
}

export const ALLOWED_HANDLERS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'
])
