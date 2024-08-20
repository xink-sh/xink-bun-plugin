/** @import { XinkConfig } from './types.js' */
/** @import { BunPlugin } from 'bun' */
import { CONFIG } from './lib/constants.js'
import { initRouter } from './lib/utils/router.js'

/** @type {XinkConfig} */
let config

/**
 * @type {BunPlugin}
 */
const xink_plugin = {
  name: 'xink-bun-plugin',
  async setup (build) {
    const mode = Bun.env['npm_lifecycle_event']
    console.log('mode:', mode)
    console.log('config:', config)

    await initRouter(config)

    console.log('end setup')
  }
}

/**
 * @param {XinkConfig} [xink_config]
 * @returns {BunPlugin}
 */
export function xink(xink_config = CONFIG) {
  console.log('init xink plugin')

  // TODO - validate and merge with default config
  config = xink_config

  return xink_plugin
}