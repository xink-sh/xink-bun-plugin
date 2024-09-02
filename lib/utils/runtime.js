/** @import { Handle, MaybePromise, RequestEvent, ResolveEvent } from '../../types.js' */

/**
 * 
 * @type {ResolveEvent}
 */
export const resolve = async (event) => {
  const cwd = process.cwd()
  console.log('cwd', cwd)
  /**
   * This check needs to stay here, so that any middleware
   * can potentially handle a requested endpoint before returning a 404.
   */
  if (!event.route) return new Response('Not Found', { status: 404 })

  const method_exists = event.route.store.methods.has(event.request.method)
  console.log('route has requested method?', method_exists)

  if (!method_exists) {
    /* We found an endpoint, but the requested method is not configured. */
    const methods = [...(event.route.store.methods)]
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': methods.join(', ') /* Ensure we return the allowed methods for the endpoint, per RFC9110. */
      }
    })
  }

  const handler = (await import(`${cwd}/${event.route.store.file}`))[event.request.method]
  console.log('handler?', handler)

  return handler(event)
}

/**
 * Directly from SvelteKit code, minus options.
 * 
 * @param {...Handle} handlers The chain of `handle` functions
 * @returns {Handle}
 */
export function sequence(...handlers) {
 const length = handlers.length;
 if (!length) return (event, resolve) => resolve(event);

 return (event, resolve) => {
   return apply_handle(0, event);

   /**
    * @param {number} i
    * @param {RequestEvent} event
    * @returns {MaybePromise<Response>}
    */
   function apply_handle(i, event) {
     const handle = handlers[i];

     return handle(
       event,
       (event) => {
         return i < length - 1
           ? apply_handle(i + 1, event)
           : resolve(event);
       }
      );
   }
 };
}