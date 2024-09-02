/** @import { XinkConfig } from './types.js' */
/** @import { BunPlugin } from 'bun' */
import { validateConfig } from './lib/utils/generic.js'
import { initRouter } from './lib/utils/router.js'

/** @type {XinkConfig} */
let config = {}

/**
 * @type {BunPlugin}
 */
const xink_plugin = {
  name: 'xink-bun-plugin',
  async setup (build) {
    const mode = Bun.env['npm_lifecycle_event']

    if (mode === 'dev') {
      await initRouter(config, true)
    } else if (mode === 'build') {
      build.config = {
        ...build.config,
        outdir: config.outdir
      }

      await initRouter(config, false, config.outdir)
    }
  }
}

/**
 * @param {XinkConfig} [xink_config]
 * @returns {BunPlugin}
 */
export function xink(xink_config = {}) {
  config = validateConfig(xink_config)

  return xink_plugin
}