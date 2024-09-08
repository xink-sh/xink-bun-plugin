/** @import { Handler, ValidatedConfig } from '../types/internal.js' */
import { statSync } from "node:fs"
import { ALLOWED_HANDLERS } from "../constants.js"

const cwd = process.cwd()

/**
 * Create manifest file.
 * 
 * @param {ValidatedConfig} config
 * @param {boolean} dev
 * @param {string} outdir
 */
export const createManifest = async (config, dev, outdir) => {
  const routes_dir = config.routes
  const params_dir = config.params
  const middleware_dir = config.middleware
  const manifest_dir = dev ? '.xink' : outdir
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

    const params_glob = new Bun.Glob('**/*.{js,ts}')

    for await (const path of params_glob.scan(params_dir)) {
      console.log('processing param', path)
      
      const src_params_path = `${cwd}/${params_dir}/${path}`
      const matcher = (await import(src_params_path)).match ?? null

      if (!matcher || typeof matcher !== 'function')
        continue

      const dev_params_path = `${params_dir}/${path}`
      const type = path.split('.')[0]
      const build_params_path = `${outdir}/params/${type}.js`

      manifest.params[type] = dev 
        ? dev_params_path
        : build_params_path.slice(outdir.length + 1)

      if (!dev) {
        // const transpiler = new Bun.Transpiler({
        //   loader: 'ts'
        // })
        // const code = await Bun.file(src_params_path).text()
        // const param_js = transpiler.transformSync(code)
        // Bun.write(build_params_path, param_js)
        const result = await Bun.build({
          entrypoints: [src_params_path]
        })
  
        for (const res of result.outputs) {
          Bun.write(build_params_path, res)
        }
      }
    }
  }

  await readParamsDir()

  const initMiddleware = async () => {
    const middleware_glob = new Bun.Glob(`middleware.{js,ts}`)
    
    for await (const path of middleware_glob.scan(middleware_dir)) {
      const src_middleware_path = `${cwd}/${middleware_dir}/${path}`

      const handle = (await import(src_middleware_path)).handle ?? null

      if (!handle)
        throw new Error('Middleware is not exporting a `handle` function.')
      
      if (typeof handle !== 'function')
        throw new Error('Middleware is not a function.')

      const dev_middleware_path = `${middleware_dir}/${path}`
      const build_middleware_path = `${outdir}/middleware.js`

      manifest.middleware = dev 
        ? dev_middleware_path
        : build_middleware_path.slice(outdir.length + 1)

      if (!dev) {
        // const transpiler = new Bun.Transpiler({
        //   loader: 'ts'
        // })
        // const code = await Bun.file(src_middleware_path).text()
        // const middleware_js = transpiler.transformSync(code)
        // Bun.write(build_middleware_path, middleware_js)
        const result = await Bun.build({
          entrypoints: [src_middleware_path]
        })
  
        for (const res of result.outputs) {
          Bun.write(build_middleware_path, res)
        }
      }
    }
  }

  await initMiddleware()

  const routes_glob = new Bun.Glob('**/route.{js,ts}')

  /* Read routes directory. */
  for await (const p of routes_glob.scan(routes_dir)) {
    console.log('accessing glob file', p)
    const parts = p.split('/')
    const dirs = parts.filter(t => !(/^route\.(?:js|ts)$/).test(t))
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

    const src_endpoint_path = `${cwd}/${routes_dir}/${p}`
    console.log('Current glob src endpoint path is', src_endpoint_path)
    const dev_endpoint_path = `${config.routes}/${p}`
    console.log('Current dev endpoint path', dev_endpoint_path)
    const module = await import(`${src_endpoint_path}`)

    /**
     * @type {[string, Handler][]}
     */
    const handlers = Object.entries(module)

    /* Ensure endpoint handlers are valid functions. */
    handlers.forEach(([key, value]) => {
      console.log('Validating handler', key)
      if (!ALLOWED_HANDLERS.has(key))
        throw new Error(`xink does not support the ${key} endpoint handler, found in ${src_endpoint_path}`)

      if (typeof value !== 'function')
        throw new Error(`Handler ${key} for ${path} is not a function.`)
    })

    const safe_path = path.replace(/:([\w.~-]+)/g, '_$1_')
    console.log('safe path', safe_path)
    const build_endpoint_path = safe_path === '/' ? `${outdir}/route.js` : `${outdir}/${safe_path.slice(1)}/route.js`
    console.log('build endpoint path', build_endpoint_path)

    if (!dev) {
      // const transpiler = new Bun.Transpiler({
      //   loader: 'ts'
      // })
      // const code = await Bun.file(src_endpoint_path).text()
      // const handlers_js = transpiler.transformSync(code)
      // Bun.write(build_endpoint_path, handlers_js)
      const result = await Bun.build({
        entrypoints: [src_endpoint_path]
      })

      for (const res of result.outputs) {
        Bun.write(build_endpoint_path, res)
      }

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
