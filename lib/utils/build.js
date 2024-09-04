import { Router } from "./medley.js"

const cwd = process.cwd()

/**
 * Temp function name. Will likely become initRouter, while the current will become something like buildRoutes.
 */
export const buildRouter = async (context) => {
  const { mode } = context
  const allowed_handlers = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'fallback'])
  const router = new Router()
  const routes = await import(`${mode === 'dev' ? `${cwd}/.xink` : cwd}/manifest.json`, { with: { type: 'json'} })
  console.log('build routes', routes)
  for (let [k, v] of Object.entries(routes)) {
    if (k === 'default')
      continue
    console.log('processing route', v)
    const module = await import(`${cwd}/${v.file}`)
    console.log('route module', module)
    const handlers = Object.entries(module)
    const store = router.register(v.path)

    store.file = v.file
    store.methods = new Set()

    console.log('Processing handlers...')
    handlers.forEach(([key, value]) => {
      console.log('Processed handler', key, ':', typeof key)
      if (typeof value !== 'function')
        throw new Error(`Handler ${key} for ${value.path} is not a function.`)
      if (!allowed_handlers.has(key))
        throw new Error(`xink does not support the ${key} endpoint handler, found in ${value.file}`)

      store.methods.add(key)
    })
    console.log('Store is', store)
  }
  return router
}