import { ALLOWED_HANDLERS } from '../constants.js'
import { Router } from '../router.js'

export const initRouter = async (context) => {
  const { mode } = context
  const cwd = process.cwd()
  
  const router = new Router()
  const manifest = await import(`${mode === 'dev' ? `${cwd}/.xink` : cwd}/manifest.json`, { with: { type: 'json'} })
  console.log('build routes', manifest)

  /* Register params. */
  for (let [k, v] of Object.entries(manifest.params)) {
    const matcher = (await import(`${cwd}/${v}`)).match ?? null
    if (matcher) router.setMatcher(k, matcher)
  }

  /* Register middleware. */
  if (manifest.middleware) {
    const handle = (await import(`${cwd}/${manifest.middleware}`)).handle ?? null
    if (handle) router.setMiddleware(handle)
  } else {
    router.setMiddleware((event, resolve) => resolve(event))
  }

  /* Register routes. */
  for (let [k, v] of Object.entries(manifest.routes)) {
    if (k === 'default')
      continue
    console.log('processing route', v)
    const module = await import(`${cwd}/${v.file}`)
    console.log('route module', module)
    const handlers = Object.entries(module)
    const store = router.register(v.path)

    console.log('Processing handlers...')
    handlers.forEach(([verb, handler]) => {
      console.log('Processed handler', verb, ':', typeof verb)
      if (typeof handler !== 'function')
        throw new Error(`Handler ${verb} for route ${v.path} is not a function.`)
      if (!ALLOWED_HANDLERS.has(verb))
        throw new Error(`xink does not support the ${verb} endpoint handler, found in ${v.file}`)

      store[verb] = handler
    })
    console.log('Store is', store)
  }

  return router
}
