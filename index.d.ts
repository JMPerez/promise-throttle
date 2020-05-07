export interface ThrottleOptions {
  requestsPerSecond: number
  promiseImplementation?: PromiseConstructorLike
}

export interface QueueOptions {
  weight?: number
  signal?: AbortSignal
}

export default class PromiseThrottle {
  constructor(options: ThrottleOptions)
  add<T>(promise: Promise<T>, opts?: QueueOptions): Promise<T>
  addAll<T>(promises: Promise<T>[], opts?: QueueOptions): Promise<T[]>
}
