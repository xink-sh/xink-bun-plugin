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
    console.log('config', config)
    console.log('build config', build.config)
    const mode = Bun.env.npm_lifecycle_event

    if (mode === 'build' && build.config) {
      console.log('build', build)
      await initRouter(config, false, build.config.outdir)
    } else if (mode === 'dev') {
      console.log('deving...')
      await initRouter(config, true)
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