declare namespace PromiseThrottle {
  /**
   * Options for the {@link PromiseThrottle} constructor.
   */
  interface ThrottleOptions {
    /**
     * The maximum amount of functions that are called per second. It must be
     * a positive number. Use `Infinity` to disable throttling.
     */
    requestsPerSecond: number
    /**
     * The `Promise` constructor used to create the promises returned by
     * {@link PromiseThrottle#add | add} and {@link PromiseThrottle#addAll | addAll}.
     *
     * @defaultValue The native `Promise`
     */
    promiseImplementation?: PromiseConstructorLike
  }

  /**
   * Options for {@link PromiseThrottle#add | add} and {@link PromiseThrottle#addAll | addAll}.
   */
  interface QueueOptions {
    /**
     * How "heavy" the function is. The function that comes after it waits
     * `weight` times longer than it would after a regular one.
     *
     * @defaultValue 1
     */
    weight?: number
    /**
     * A signal to abort the function while it is queued. When it is aborted,
     * the returned promise is rejected right away with `signal.reason`, or with
     * an error whose `name` is `AbortError`. Aborted functions don't count
     * towards the limit of requests per second.
     */
    signal?: AbortSignal
  }

  /**
   * A function that is called when the throttling allows it. It can return a
   * promise or any other value.
   */
  type PromiseCreator<T> = () => T | PromiseLike<T>
}

/**
 * Limits the amount of functions returning promises that are called per second.
 *
 * @example
 * ```js
 * const throttle = new PromiseThrottle({ requestsPerSecond: 2 });
 *
 * const response = await throttle.add(() => fetch('https://example.com/a'));
 * console.log(response.status);
 * ```
 */
declare class PromiseThrottle {
  /**
   * @throws `TypeError` when `requestsPerSecond` is not a positive number.
   */
  constructor(options: PromiseThrottle.ThrottleOptions)

  /**
   * Queues a function, which is called when the throttling allows it.
   *
   * @returns A promise resolved or rejected with the result of the function.
   * If the function throws, the promise is rejected with the thrown error.
   */
  add<T>(promiseCreator: PromiseThrottle.PromiseCreator<T>, opts?: PromiseThrottle.QueueOptions): Promise<T>

  /**
   * Queues several functions with the same options.
   *
   * @returns A promise resolved with the results of all the functions, in the
   * same order, or rejected with the first error.
   */
  addAll<T>(promisesCreators: PromiseThrottle.PromiseCreator<T>[], opts?: PromiseThrottle.QueueOptions): Promise<T[]>
}

export = PromiseThrottle
