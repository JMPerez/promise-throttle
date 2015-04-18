(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.PromiseThrottle = require('./main');
},{"./main":2}],2:[function(require,module,exports){
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
  this.lastStartTime = 0;
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
  if (this.queued.length === 0) {
    return;
  }

  var now = new Date(),
      inc = 1000 / this.requestsPerSecond,
      elapsed = now - this.lastStartTime;

  if (elapsed >= inc) {
    this._execute();
  } else {
    // we have reached the limit, schedule a dequeue operation
    setTimeout(function() {
      this.dequeue();
    }.bind(this), inc - elapsed);
  }
};

/**
 * Executes the promise
 */
PromiseThrottle.prototype._execute = function () {
  this.lastStartTime = new Date();
  var candidate = this.queued.shift();
  candidate.promise().then(function(r) {
    candidate.resolve(r);
  }).catch(function(r) {
    candidate.reject(r);
  });
};

module.exports = PromiseThrottle;

},{}]},{},[1]);
