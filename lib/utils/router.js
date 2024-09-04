/** @import { Handler, Matcher, ValidatedConfig } from '../types/internal.js' */
/** @import { Router } from './medley.js' */
/** @import { XinkConfig } from '../../types.js' */
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

/**
 * Initialize routes.
 * 
 * @param {XinkConfig} config
 * @param {boolean} dev
 * @param {string} outdir
 * @returns {Promise<Router>}
 */
export const initRouter = async (config, dev, outdir) => {
  c = config ? validateConfig(config) : CONFIG
  const routes_dir = c.routes
  const params_dir = c.params
  const manifest_dir = dev ? '.xink' : outdir
  const allowed_handlers = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'])
  
  try {
    statSync(`${cwd}/${routes_dir}`).isDirectory()
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
      statSync(`${cwd}/${dir}`).isDirectory()
    } catch (error) {
      return
    }

    const files = readdirSync(dir)
    //console.log('params files', files)

    for (const f of files) {
      const module = await import(`${cwd}/${dir}/${f}`)
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

  await initMiddleware()

  const glob = new Bun.Glob('**/*.ts')
  const routes_manifest = {}

  /* Read routes directory. */
  for await (const file of glob.scan(routes_dir)) {
    console.log('accessing glob')
    const parts = file.split('/')
    const dirs = parts.filter(t => t !== 'endpoint.ts')
    let path = dirs.length === 0 ? '/' : `/${dirs.join('/')}`
    console.log('router: init path', path)

    /* Convert matcher segments. */
    path = path.replace(/\[{1}([\w.~-]+?=[a-zA-Z]+?)\]{1}/g, ':$1')

    /* Convert optional segments. */
    path = path.replace(/\[{2}([\w.~-]+?)\]{2}/g, ':$1?')

    /* Convert rest segments. */
    path = path.replace(/\[{1}\.{3}[\w.~-]+?\]{1}/g, '*')

    /* Convert specific and dynamic segments. */
    path = path.replace(/\[{1}/g, ':')
    path = path.replace(/\]{1}/g, '')

    console.log('router: final path', path)

    const local_endpoint_path = `${cwd}/${routes_dir}/${file}`
    console.log('Current glob local endpoint path is', local_endpoint_path)
    const dev_endpoint_path = `${c.routes}/${file}`
    console.log('Current dev endpoint path', dev_endpoint_path)
    //const module = await import(`${local_endpoint_path}`)

    /**
     * @type {[string, Handler][]}
     */
    // const handlers = Object.entries(module)
    // const store = router.register(path)
    // console.log('init store is', store)

    const safe_path = path.replace(/:([\w.~-]+)/g, '_$1_')
    console.log('safe path', safe_path)
    const build_endpoint_path = `${outdir}/endpoints/${safe_path.slice(1) ? safe_path.slice(1) + '/endpoint.js': 'endpoint.js'}`
    console.log('build endpoint path', build_endpoint_path)
    // store.file = dev
    //   ? dev_endpoint_path
    //   : build_endpoint_path,
    // store.methods = new Set()

    // console.log('Processing handlers...')
    // handlers.forEach(([key, value]) => {
    //   console.log('Processed handler', key, ':', typeof key)
    //   if (typeof value !== 'function')
    //     throw new Error(`Handler ${key} for ${path} is not a function.`)
    //   if (!allowed_handlers.has(key))
    //     throw new Error(`xink does not support the ${key} endpoint handler, found in ${local_endpoint_path}`)

    //   store.methods.add(key)
    // })
    // console.log('Store is', store)

    if (!dev) {
      const transpiler = new Bun.Transpiler({
        loader: 'ts'
      })
      const code = await Bun.file(local_endpoint_path).text()
      const handlers_js = transpiler.transformSync(code)
      Bun.write(build_endpoint_path, handlers_js)

      routes_manifest[build_endpoint_path.slice(outdir.length + 1)] = {
        path,
        file: build_endpoint_path.slice(outdir.length + 1)
      }
    } else {
      routes_manifest[dev_endpoint_path] = {
        path,
        file: dev_endpoint_path
      }
    }

  
  }

  console.log('grabbing manifest')
  const manifest_path = `${cwd}/${manifest_dir}/manifest.json`
  console.log('manifest path', manifest_path)
  Bun.write(manifest_path, JSON.stringify(routes_manifest))

  //return router
}

const initMiddleware = async () => {
  const middleware_path = `${cwd}/src/middleware.ts`
  try {
    statSync(middleware_path).isFile()
  } catch (error) {
    return
  }

  const handle = (await import(middleware_path)).handle ?? null
  router.setMiddleware(handle)
}