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

  const handler = event.route.store[event.request.method] ?? event.route.store['fallback']

  if (!handler)
    /**
     * TODO ??
     * Add config option to suppress a 405 and instead send a 404.
     */

    /* We found an endpoint, but the requested method is not configured. */
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': Object.keys(event.route.store).join(', ') /* Ensure we return the allowed methods for the endpoint, per RFC9110. */
      }
    })

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
