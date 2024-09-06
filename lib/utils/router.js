/** @import { Handler, Matcher, ValidatedConfig } from '../types/internal.js' */
/** @import { XinkConfig } from '../../types.js' */
import { statSync } from "node:fs"
import { validateConfig } from "./generic.js"
import { CONFIG } from "../constants.js"

/**
 * @type {ValidatedConfig}
 */
let c

const cwd = process.cwd()

/**
 * Build manifest files.
 * 
 * @param {XinkConfig} config
 * @param {boolean} dev
 * @param {string} outdir
 */
export const buildManifest = async (config, dev, outdir) => {
  c = config ? validateConfig(config) : CONFIG
  const routes_dir = c.routes
  const params_dir = c.params
  const manifest_dir = dev ? '.xink' : outdir
  const allowed_handlers = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'])
  const manifest = {
    routes: {},
    params: {},
    middleware: null
  }
  
  try {
    statSync(`${cwd}/${routes_dir}`).isDirectory()
  } catch (err) {
    throw new Error(`Routes directory ${routes_dir} does not exist.`)
  }

  /**
   * 
   * @returns {Promise<void>}
   */
  const readParamsDir = async () => {
    try {
      statSync(`${cwd}/${params_dir}`).isDirectory()
    } catch (err) {
      return
    }

    const params_glob = new Bun.Glob('**/*.ts')

    for await (const file of params_glob.scan(params_dir)) {
      console.log('processing param', file)
      
      const src_params_path = `${cwd}/${params_dir}/${file}`
      const matcher = (await import(src_params_path)).match ?? null

      if (!matcher || typeof matcher !== 'function')
        continue

      const dev_params_path = `${params_dir}/${file}`
      const type = file.split('.')[0]
      const build_params_path = `${outdir}/params/${type}.js`

      manifest.params[type] = dev 
        ? dev_params_path
        : build_params_path.slice(outdir.length + 1)

      if (!dev) {
        const transpiler = new Bun.Transpiler({
          loader: 'ts'
        })
        const code = await Bun.file(src_params_path).text()
        const param_js = transpiler.transformSync(code)
        Bun.write(build_params_path, param_js)
      }
    }

    //const files = readdirSync(dir)
    //console.log('params files', files)

    // for (const f of files) {
    //   const module = await import(`${cwd}/${dir}/${f}`)
    //   //console.log('module', module)
    //   const type = f.split('.')[0]
    //   //console.log('param type is', type)

    //   /**
    //    * @type {Matcher}
    //    */
    //   const matcher = module['match']

    //   if (matcher)
    //     manifest.params[type] = matcher
    // }
  }

  await readParamsDir()

  const initMiddleware = async () => {
    const src_middleware_path = `${cwd}/src/middleware.ts`
    try {
      statSync(src_middleware_path).isFile()
    } catch (err) {
      return
    }
  
    const handle = (await import(src_middleware_path)).handle ?? null

    if (!handle)
      throw new Error('Middleware is not exporting a `handle` function.')
    
    if (typeof handle !== 'function')
      throw new Error('Middleware is not a function.')

    const dev_middleware_path = `src/middleware.ts`
    const build_middleware_path = `${outdir}/middleware.js`

    manifest.middleware = dev 
      ? dev_middleware_path
      : build_middleware_path.slice(outdir.length + 1)

    if (!dev) {
      const transpiler = new Bun.Transpiler({
        loader: 'ts'
      })
      const code = await Bun.file(src_middleware_path).text()
      const middleware_js = transpiler.transformSync(code)
      Bun.write(build_middleware_path, middleware_js)
    }
  }

  await initMiddleware()

  const routes_glob = new Bun.Glob('**/*.ts')

  /* Read routes directory. */
  for await (const file of routes_glob.scan(routes_dir)) {
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

    const src_endpoint_path = `${cwd}/${routes_dir}/${file}`
    console.log('Current glob src endpoint path is', src_endpoint_path)
    const dev_endpoint_path = `${c.routes}/${file}`
    console.log('Current dev endpoint path', dev_endpoint_path)
    const module = await import(`${src_endpoint_path}`)

    /**
     * @type {[string, Handler][]}
     */
    const handlers = Object.entries(module)

    /* Ensure endpoint handlers are valid functions. */
    handlers.forEach(([key, value]) => {
      console.log('Validating handler', key)
      if (!allowed_handlers.has(key))
        throw new Error(`xink does not support the ${key} endpoint handler, found in ${src_endpoint_path}`)

      if (typeof value !== 'function')
        throw new Error(`Handler ${key} for ${path} is not a function.`)
    })

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
    //     throw new Error(`xink does not support the ${key} endpoint handler, found in ${src_endpoint_path}`)

    //   store.methods.add(key)
    // })
    // console.log('Store is', store)

    if (!dev) {
      const transpiler = new Bun.Transpiler({
        loader: 'ts'
      })
      const code = await Bun.file(src_endpoint_path).text()
      const handlers_js = transpiler.transformSync(code)
      Bun.write(build_endpoint_path, handlers_js)

      manifest.routes[build_endpoint_path.slice(outdir.length + 1)] = {
        path,
        file: build_endpoint_path.slice(outdir.length + 1)
      }
    } else {
      manifest.routes[dev_endpoint_path] = {
        path,
        file: dev_endpoint_path
      }
    }

  
  }

  console.log('grabbing manifest')
  const routes_manifest_path = `${cwd}/${manifest_dir}/manifest.json`
  console.log('manifest path', routes_manifest_path)
  Bun.write(routes_manifest_path, JSON.stringify(manifest))
  console.log('manifest:', manifest)
}
