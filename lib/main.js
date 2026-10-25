'use strict';

/**
 * Returns the value to reject an aborted operation with. It uses the reason
 * of the signal when available, falling back to an "AbortError"
 * @param {AbortSignal} signal The aborted signal
 * @return {*} The reason to reject the promise with
 */
function getAbortReason(signal) {
  if (typeof signal.reason !== 'undefined') {
    return signal.reason;
  }
  if (typeof DOMException === 'function') {
    return new DOMException('The operation was aborted.', 'AbortError');
  }
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

/**
 * Stops listening to the signal of a queued operation
 * @param {Object} candidate The queued operation
 * @return {void}
 */
function removeAbortListener(candidate) {
  if (candidate.onAbort) {
    candidate.signal.removeEventListener('abort', candidate.onAbort);
  }
}

class PromiseThrottle {
  /**
   * @param {Object} options A set of options to pass to the throttle function
   * @param {number} options.requestsPerSecond The amount of requests per second
   *                                           the library will limit to
   * @param {Function} [options.promiseImplementation] The Promise constructor to
   *                                                   use. Defaults to Promise
   */
  constructor(options) {
    const { requestsPerSecond, promiseImplementation } = options || {};
    if (typeof requestsPerSecond !== 'number' || !(requestsPerSecond > 0)) {
      throw new TypeError('requestsPerSecond must be a positive number');
    }
    this.requestsPerSecond = requestsPerSecond;
    this.promiseImplementation = promiseImplementation || Promise;
    this.lastStartTime = 0;
    this.lastWeight = 0;
    this.queued = [];
    this.timer = null;
  }

  /**
   * Adds a promise
   * @param {Function} promise A function returning the promise to be added
   * @param {Object} options A set of options.
   * @param {AbortSignal} options.signal An AbortSignal object that can be used to abort the returned promise
   * @param {number} options.weight A "weight" of each operation resolving by array of promises
   * @return {Promise} A promise
   */
  add(promise, options) {
    const { signal, weight } = options || {};
    return new this.promiseImplementation((resolve, reject) => {
      if (signal?.aborted) {
        reject(getAbortReason(signal));
        return;
      }

      const candidate = {
        resolve,
        reject,
        promise,
        weight: weight || 1,
        signal
      };

      if (typeof signal?.addEventListener === 'function') {
        // reject as soon as the signal is aborted instead of waiting for its turn
        candidate.onAbort = () => this._abort(candidate);
        signal.addEventListener('abort', candidate.onAbort);
      }

      this.queued.push(candidate);
      this.dequeue();
    });
  }

  /**
   * Adds all the promises passed as parameters
   * @param {Function[]} promises An array of functions that return a promise
   * @param {Object} options A set of options.
   * @param {AbortSignal} options.signal An AbortSignal object that can be used to abort the returned promise
   * @param {number} options.weight A "weight" of each operation resolving by array of promises
   * @return {Promise} A promise that succeeds when all the promises passed as options do
   */
  addAll(promises, options) {
    return this.promiseImplementation.all(promises.map((promise) => this.add(promise, options)));
  }

  /**
   * Dequeues a promise
   * @return {void}
   */
  dequeue() {
    while (this.queued.length > 0 && !this.timer) {
      const candidate = this.queued[0];
      if (candidate.signal?.aborted) {
        // signals that can't notify us are checked here, without using a slot
        this._abort(candidate);
        continue;
      }

      // the weight of the last operation determines how long the next one waits
      const inc = (1000 / this.requestsPerSecond) * this.lastWeight;
      const elapsed = Date.now() - this.lastStartTime;

      if (elapsed >= inc) {
        this._execute();
      } else {
        // we have reached the limit, schedule a dequeue operation
        this.timer = setTimeout(() => {
          this.timer = null;
          this.dequeue();
        }, inc - elapsed);
      }
    }
  }

  /**
   * Removes an aborted operation from the queue and rejects its promise
   * @private
   * @param {Object} candidate The queued operation
   * @return {void}
   */
  _abort(candidate) {
    const index = this.queued.indexOf(candidate);
    if (index !== -1) {
      this.queued.splice(index, 1);
      removeAbortListener(candidate);
      candidate.reject(getAbortReason(candidate.signal));
    }
  }

  /**
   * Executes the promise
   * @private
   * @return {void}
   */
  _execute() {
    const candidate = this.queued.shift();
    removeAbortListener(candidate);
    this.lastStartTime = Date.now();
    this.lastWeight = candidate.weight;
    try {
      // resolving with the returned value adopts its state when it is a promise
      candidate.resolve(candidate.promise());
    } catch (e) {
      candidate.reject(e);
    }
  }
}

module.exports = PromiseThrottle;
