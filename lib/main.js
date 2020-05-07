const PromiseThrottle = (function() {
  /**
   * @constructor
   * @param {Object} options A set op options to pass to the throttle function
   *        @param {number} requestsPerSecond The amount of requests per second
   *                                          the library will limit to
   */
  return function(options) {
    const requestsPerSecond = options.requestsPerSecond,
      promiseImplementation = options.promiseImplementation || Promise,
      queued = [];
    let lastStartTime = null;

    function execute() {
      lastStartTime = Date.now();
      const candidate = queued.shift();
      const aborted = candidate.signal && candidate.signal.aborted;
      if (aborted) {
        candidate.reject(new DOMException('', 'AbortError'));
      } else {
        candidate.promise().then(candidate.resolve).catch(candidate.reject);
      }
    }

    function dequeue() {
      if (queued.length > 0) {
        const now = Date.now(),
          weight = queued[0].weight,
          inc = (1000 / requestsPerSecond) * weight,
          elapsed = now - lastStartTime;

        if (elapsed >= inc) {
          execute();
        } else {
          // we have reached the limit, schedule a dequeue operation
          setTimeout(dequeue, inc - elapsed);
        }
      }
    }

    function add(promise, options) {
      const opt = options || {};
      return new promiseImplementation(function(resolve, reject) {
        queued.push({
          resolve: resolve,
          reject: reject,
          promise: promise,
          weight: opt.weight || 1,
          signal: opt.signal,
        });

        dequeue();
      });
    }

    return {
      /**
       * Adds a promise
       * @param {Function} promise A function returning the promise to be added
       * @param {Object} options A set of options.
       * @param {number} options.signal An AbortSignal object that can be used to abort the returned promise
       * @param {number} options.weight A "weight" of each operation resolving by array of promises
       * @return {Promise} A promise
       */
      add: add,

      /**
       * Adds all the promises passed as parameters
       * @param {Function} promises An array of functions that return a promise
       * @param {Object} options A set of options.
       * @param {number} options.signal An AbortSignal object that can be used to abort the returned promise
       * @param {number} options.weight A "weight" of each operation resolving by array of promises
       * @return {Promise} A promise that succeeds when all the promises passed as options do
       */
      addAll: function(promises, options) {
        const addedPromises = promises.map(function(promise) {
          return add(promise, options);
        });

        return Promise.all(addedPromises);
      },
    };
  };
})();

export default PromiseThrottle;
