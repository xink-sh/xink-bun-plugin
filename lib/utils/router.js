/** @import { Handler, Matcher, ValidatedConfig } from '../types/internal.js' */
/** @import { Router } from './medley.js' */
/** @import { XinkConfig } from '../../types.js' */
import { join } from "node:path"
import { readdirSync, statSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { validateConfig } from "./generic.js"
import { CONFIG } from "../constants.js"
import { Router } from "./medley.js"

/**
 * @type {ValidatedConfig}
 */
let c

const cwd = process.cwd()
console.log('cwd:', cwd)
console.log('Creating router')
export const router = new Router()

const xink_dir = join(cwd, '.xink/endpoints')

try {
  statSync(xink_dir).isDirectory()
  console.log('.xink/endpoints directory exists')
} catch (err) {
  console.log('Creating .xink/endpoints directory')
  await mkdir(xink_dir, { recursive: true })
}

/**
 * Initialize routes.
 * 
 * @param {XinkConfig} config
 * @returns {Promise<Router>}
 */
export const initRouter = async (config) => {
  c = config ? validateConfig(config) : CONFIG
  const routes_dir = c.routes
  const params_dir = c.params
  const allowed_handlers = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'])
  
  try {
    statSync(join(cwd, routes_dir)).isDirectory()
  } catch (err) {
    throw new Error(`Routes directory ${routes_dir} does not exist.`)
  }

  /**
   * 
   * @param {string} dir
   * @returns {Promise<void>}
   */
  const readParamsDir = async (dir) => {
    try {
      statSync(join(cwd, dir)).isDirectory()
    } catch (error) {
      return
    }

    const files = readdirSync(dir)
    //console.log('params files', files)

    for (const f of files) {
      const module = await import(`${join(cwd, dir, f)}`)
      //console.log('module', module)
      const type = f.split('.')[0]
      //console.log('param type is', type)

      /**
       * @type {Matcher}
       */
      const matcher = module['match']

      if (matcher)
        router.setMatcher(type, matcher)
    }
  }

  /* Read params directory. */
  await readParamsDir(params_dir)

  /**
   * 
   * @param {string} dir
   * @returns {Promise<void>}
   */
  const readDirRecursive = async (dir) => {
    const directories = readdirSync(dir)
    let path = dir.substring(routes_dir.length) || '/'

    /* Convert matcher segments. */
    path = path.replace(/\[{1}([\w.~-]+?=[a-zA-Z]+?)\]{1}/g, ':$1')

    /* Convert optional segments. */
    path = path.replace(/\[{2}([\w.~-]+?)\]{2}/g, ':$1?')

    /* Convert rest segments. */
    path = path.replace(/\[{1}\.{3}[\w.~-]+?\]{1}/g, '*')

    /* Convert specific and dynamic segments. */
    path = path.replace(/\[{1}/g, ':')
    path = path.replace(/\]{1}/g, '')

    for (const f of directories) {
      if (f === 'endpoint.ts') {
        console.log('Current dir', dir)
        const cur_endpoint_path = join(cwd, dir, f)
        console.log('Current endpoint is', cur_endpoint_path)
        const module = await import(`${cur_endpoint_path}`)
        
        const cur_route_dir = dir.split(routes_dir)[1] || '/'
        console.log('Current route dir', cur_route_dir)

        const module_dir = join(xink_dir, cur_route_dir)
        console.log('Current module dir', module_dir)

        try {
          statSync(module_dir).isDirectory()
          console.log(`${module_dir} directory already exists`)
        } catch (err) {
          console.log(`Creating ${module_dir} directory`)
          await mkdir(module_dir, { recursive: true })
        }

        const module_path = join(module_dir, f)
        try {
          Bun.write(module_path, Bun.file(cur_endpoint_path))
        } catch (err) {
          console.log('Error writing file', err)
        }
        
        /**
         * @type {[string, Handler][]}
         */
        const handlers = Object.entries(module)
        const store = router.register(path)

        handlers.forEach(([key, value]) => {
          if (typeof value !== 'function')
            throw new Error(`Handler ${key} for ${path} is not a function.`)
          if (!allowed_handlers.has(key))
            throw new Error(`xink does not support the ${key} endpoint handler, found in ${join(dir, f)}`)

          store[key] = value
        })
      } else {
        const absolute_path = join(dir, f)
        await readDirRecursive(absolute_path)
      }
    }
  }

  /* Read routes directory. */
  await readDirRecursive(`${routes_dir}`)

  await initMiddleware()

  return router
}

const initMiddleware = async () => {
  const middleware_path = join(cwd, 'src/middleware.ts')
  try {
    statSync(middleware_path).isFile()
  } catch (error) {
    return
  }

  const handle = (await import(middleware_path)).handle ?? null
  router.setMiddleware(handle)
}