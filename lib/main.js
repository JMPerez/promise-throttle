/* exported PromiseThrottle */

'use strict';

/**
 * @constructor
 * @param {Object} options A set op options to pass to the throttle function
 *        @param {number} requestsPerSecond The amount of requests per second
 *                                          the library will limit to
 */
function PromiseThrottle(options) {
  this.requestsPerSecond = options.requestsPerSecond;
  this.promiseImplementation = options.promiseImplementation || Promise;
  this.lastStartTime = 0;
  this.queued = [];
}

/**
 * Adds a promise
 * @param {Function} promise A function returning the promise to be added
 * @param {number} weigth A "weight" of operation resolving by this promise
 * @return {Promise} A promise
 */
PromiseThrottle.prototype.add = function(promise, weigth) {
  var self = this;
  return new self.promiseImplementation(function(resolve, reject) {
    self.queued.push({
      resolve: resolve,
      reject: reject,
      promise: promise,
      weight: weigth || 1,
    });

    self.dequeue();
  });
};

/**
 * Adds all the promises passed as parameters
 * @param {Function} promises An array of functions that return a promise
 * @param {number} weigth A "weight" of each operation resolving by array of promises
 * @return {void}
 */
PromiseThrottle.prototype.addAll = function(promises, weigth) {
  var addedPromises = promises.map(function(promise) {
    return this.add(promise, weigth || 1);
  }.bind(this));

  return Promise.all(addedPromises);
};

/**
 * Dequeues a promise
 * @return {void}
 */
PromiseThrottle.prototype.dequeue = function() {
  if (this.queued.length > 0) {
    var now = new Date(),
      weigth = this.queued[0].weight,
      inc = (1000 / this.requestsPerSecond) * weigth,
      elapsed = now - this.lastStartTime;

    if (elapsed >= inc) {
      this._execute();
    } else {
      // we have reached the limit, schedule a dequeue operation
      setTimeout(function() {
        this.dequeue();
      }.bind(this), inc - elapsed);
    }
  }
};

/**
 * Executes the promise
 * @private
 * @return {void}
 */
PromiseThrottle.prototype._execute = function() {
  this.lastStartTime = new Date();
  var candidate = this.queued.shift();
  candidate.promise().then(function(r) {
    candidate.resolve(r);
  }).catch(function(r) {
    candidate.reject(r);
  });
};

module.exports = PromiseThrottle;
