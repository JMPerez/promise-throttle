export interface ThrottleOptions {
  requestsPerSecond: number
  promiseImplementation?: PromiseConstructorLike
}

export interface QueueOptions {
  weight?: number
  signal?: AbortSignal
}

type PromiseCreator<T> = () => Promise<T>

export default class PromiseThrottle {
  constructor(options: ThrottleOptions)
  add<T>(promiseCreator: PromiseCreator<T>, opts?: QueueOptions): Promise<T>
  addAll<T>(promisesCreators: PromiseCreator<T>[], opts?: QueueOptions): Promise<T[]>
}
