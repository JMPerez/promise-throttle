declare namespace PromiseThrottle {
  interface ThrottleOptions {
    requestsPerSecond: number
    promiseImplementation?: PromiseConstructorLike
  }

  interface QueueOptions {
    weight?: number
    signal?: AbortSignal
  }

  type PromiseCreator<T> = () => T | PromiseLike<T>
}

declare class PromiseThrottle {
  constructor(options: PromiseThrottle.ThrottleOptions)
  add<T>(promiseCreator: PromiseThrottle.PromiseCreator<T>, opts?: PromiseThrottle.QueueOptions): Promise<T>
  addAll<T>(promisesCreators: PromiseThrottle.PromiseCreator<T>[], opts?: PromiseThrottle.QueueOptions): Promise<T[]>
}

export = PromiseThrottle
