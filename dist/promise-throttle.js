(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
window.PromiseThrottle = require('./main');

},{"./main":2}],2:[function(require,module,exports){
/* exported PromiseThrottle */

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
  var error = new Error('The operation was aborted.');
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

/**
 * @constructor
 * @param {Object} options A set of options to pass to the throttle function
 * @param {number} options.requestsPerSecond The amount of requests per second
 *                                           the library will limit to
 * @param {Function} [options.promiseImplementation] The Promise constructor to
 *                                                   use. Defaults to Promise
 */
function PromiseThrottle(options) {
  var opt = options || {};
  if (typeof opt.requestsPerSecond !== 'number' || !(opt.requestsPerSecond > 0)) {
    throw new TypeError('requestsPerSecond must be a positive number');
  }
  this.requestsPerSecond = opt.requestsPerSecond;
  this.promiseImplementation = opt.promiseImplementation || Promise;
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
PromiseThrottle.prototype.add = function(promise, options) {
  var self = this;
  var opt = options || {};
  return new self.promiseImplementation(function(resolve, reject) {
    var signal = opt.signal;
    if (signal && signal.aborted) {
      reject(getAbortReason(signal));
      return;
    }

    var candidate = {
      resolve: resolve,
      reject: reject,
      promise: promise,
      weight: opt.weight || 1,
      signal: signal
    };

    if (signal && typeof signal.addEventListener === 'function') {
      // reject as soon as the signal is aborted instead of waiting for its turn
      candidate.onAbort = function() {
        self._abort(candidate);
      };
      signal.addEventListener('abort', candidate.onAbort);
    }

    self.queued.push(candidate);
    self.dequeue();
  });
};

/**
 * Adds all the promises passed as parameters
 * @param {Function[]} promises An array of functions that return a promise
 * @param {Object} options A set of options.
 * @param {AbortSignal} options.signal An AbortSignal object that can be used to abort the returned promise
 * @param {number} options.weight A "weight" of each operation resolving by array of promises
 * @return {Promise} A promise that succeeds when all the promises passed as options do
 */
PromiseThrottle.prototype.addAll = function(promises, options) {
  var addedPromises = promises.map(function(promise) {
    return this.add(promise, options);
  }.bind(this));

  return this.promiseImplementation.all(addedPromises);
};

/**
 * Dequeues a promise
 * @return {void}
 */
PromiseThrottle.prototype.dequeue = function() {
  while (this.queued.length > 0 && !this.timer) {
    var candidate = this.queued[0];
    if (candidate.signal && candidate.signal.aborted) {
      // signals that can't notify us are checked here, without using a slot
      this._abort(candidate);
      continue;
    }

    // the weight of the last operation determines how long the next one waits
    var inc = (1000 / this.requestsPerSecond) * this.lastWeight,
      elapsed = Date.now() - this.lastStartTime;

    if (elapsed >= inc) {
      this._execute();
    } else {
      // we have reached the limit, schedule a dequeue operation
      this.timer = setTimeout(function() {
        this.timer = null;
        this.dequeue();
      }.bind(this), inc - elapsed);
    }
  }
};

/**
 * Removes an aborted operation from the queue and rejects its promise
 * @private
 * @param {Object} candidate The queued operation
 * @return {void}
 */
PromiseThrottle.prototype._abort = function(candidate) {
  var index = this.queued.indexOf(candidate);
  if (index !== -1) {
    this.queued.splice(index, 1);
    removeAbortListener(candidate);
    candidate.reject(getAbortReason(candidate.signal));
  }
};

/**
 * Executes the promise
 * @private
 * @return {void}
 */
PromiseThrottle.prototype._execute = function() {
  var candidate = this.queued.shift();
  removeAbortListener(candidate);
  this.lastStartTime = Date.now();
  this.lastWeight = candidate.weight;
  try {
    // resolving with the returned value adopts its state when it is a promise
    candidate.resolve(candidate.promise());
  } catch (e) {
    candidate.reject(e);
  }
};

module.exports = PromiseThrottle;

},{}]},{},[1]);
