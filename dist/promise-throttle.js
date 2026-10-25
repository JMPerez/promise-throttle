"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // lib/main.js
  var require_main = __commonJS({
    "lib/main.js"(exports, module) {
      "use strict";
      function getAbortReason(signal) {
        return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
      }
      var PromiseThrottle = class {
        #requestsPerSecond;
        #promiseImplementation;
        #lastStartTime = 0;
        #lastWeight = 0;
        #queued = [];
        #timer = null;
        /**
         * @param {Object} options A set of options to pass to the throttle function
         * @param {number} options.requestsPerSecond The amount of requests per second
         *                                           the library will limit to
         * @param {Function} [options.promiseImplementation] The Promise constructor to
         *                                                   use. Defaults to Promise
         */
        constructor(options) {
          const { requestsPerSecond, promiseImplementation } = options || {};
          if (typeof requestsPerSecond !== "number" || !(requestsPerSecond > 0)) {
            throw new TypeError("requestsPerSecond must be a positive number");
          }
          this.#requestsPerSecond = requestsPerSecond;
          this.#promiseImplementation = promiseImplementation || Promise;
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
          return new this.#promiseImplementation((resolve, reject) => {
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
            if (signal) {
              candidate.onAbort = () => this.#abort(candidate);
              signal.addEventListener("abort", candidate.onAbort);
            }
            this.#queued.push(candidate);
            this.#dequeue();
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
          return this.#promiseImplementation.all(promises.map((promise) => this.add(promise, options)));
        }
        /**
         * Calls the queued functions, scheduling a single timer when the limit is reached
         * @return {void}
         */
        #dequeue() {
          while (this.#queued.length > 0 && !this.#timer) {
            const inc = 1e3 / this.#requestsPerSecond * this.#lastWeight;
            const elapsed = Date.now() - this.#lastStartTime;
            if (elapsed >= inc) {
              this.#execute();
            } else {
              this.#timer = setTimeout(() => {
                this.#timer = null;
                this.#dequeue();
              }, inc - elapsed);
            }
          }
        }
        /**
         * Removes an aborted operation from the queue and rejects its promise
         * @param {Object} candidate The queued operation
         * @return {void}
         */
        #abort(candidate) {
          const index = this.#queued.indexOf(candidate);
          if (index !== -1) {
            this.#queued.splice(index, 1);
            candidate.signal.removeEventListener("abort", candidate.onAbort);
            candidate.reject(getAbortReason(candidate.signal));
          }
        }
        /**
         * Executes the promise
         * @return {void}
         */
        #execute() {
          const candidate = this.#queued.shift();
          candidate.signal?.removeEventListener("abort", candidate.onAbort);
          this.#lastStartTime = Date.now();
          this.#lastWeight = candidate.weight;
          try {
            candidate.resolve(candidate.promise());
          } catch (e) {
            candidate.reject(e);
          }
        }
      };
      module.exports = PromiseThrottle;
    }
  });

  // lib/browser.js
  window.PromiseThrottle = require_main();
})();
