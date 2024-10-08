/** @import { XinkConfig } from './types.js' */
/** @import { BunPlugin } from 'bun' */
import { validateConfig } from './lib/utils/config.js'
import { createManifest } from './lib/shared/manifest.js'

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
      await createManifest(config, false, build.config)
    } else if (mode === 'dev') {
      console.log('deving...')
      await createManifest(config, true)
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
