/* exported PromiseThrottle */

'use strict';

/**
 * @constructor
 * @param {number} requestsPerSecond The amount of requests per second
 *   the library will limit to
 */
function PromiseThrottle(options) {
  this.requestsPerSecond = options.requestsPerSecond;
  this.promiseImplementation = options.promiseImplementation || Promise;
  this.startTimesArray = [];
  this.queued = [];
}

/**
 * Adds a promise
 * @param {Promise} promise The promise to be added
 */
PromiseThrottle.prototype.add = function (promise) {
  var self = this;
  return new self.promiseImplementation(function(resolve, reject) {
    self.queued.push({
      resolve: resolve,
      reject: reject,
      promise: promise
    });

    self.dequeue();
  });
};

/**
 * Adds all the promises passed as parameters
 * @param {array} promises An array of promises
 */
PromiseThrottle.prototype.addAll = function (promises) {
  promises.forEach(function(promise) {
    this.add(promise);
  }.bind(this));
};

/**
 * Dequeues a promise
 */
PromiseThrottle.prototype.dequeue = function () {
  // have we issued more requests than requestsPerSecond
  // during last second ?
  if (this.queued.length === 0) {
    return;
  }

  if (this.startTimesArray.length < this.requestsPerSecond) {
    this._execute();
  } else {
    var referencePosition = this.startTimesArray.length - this.requestsPerSecond,
        timeDiff = (new Date()).getTime() - this.startTimesArray[referencePosition].getTime();
    if (timeDiff > 1000) {
      this._execute();
    } else {
      // we have reached the limit, schedule a dequeue operation
      //console.log('Scheduling');
      var self = this;
      setTimeout(function() {
        self.dequeue();
      }, timeDiff);
    }
  }
};

/**
 * Executes the promise
 */
PromiseThrottle.prototype._execute = function () {
  this.startTimesArray.push(new Date());
  if (this.startTimesArray.length > this.requestsPerSecond) {
    var referencePosition = this.startTimesArray.length - this.requestsPerSecond;
    this.startTimesArray = this.startTimesArray.slice(referencePosition);
  }
  var candidate = this.queued.shift();
  candidate.promise().then(function(r) {
    candidate.resolve(r);
  }).catch(function(r) {
    candidate.reject(r);
  });
};

module.exports = PromiseThrottle;
