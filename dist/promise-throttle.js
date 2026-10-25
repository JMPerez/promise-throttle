"use strict";
(function() {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = function(cb, mod) {
    return function __require() {
      try {
        return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
      } catch (e) {
        throw mod = 0, e;
      }
    };
  };

  // lib/main.js
  var require_main = __commonJS({
    "lib/main.js": function(exports, module) {
      "use strict";
      function getAbortReason(signal) {
        if (typeof signal.reason !== "undefined") {
          return signal.reason;
        }
        if (typeof DOMException === "function") {
          return new DOMException("The operation was aborted.", "AbortError");
        }
        var error = new Error("The operation was aborted.");
        error.name = "AbortError";
        return error;
      }
      function removeAbortListener(candidate) {
        if (candidate.onAbort) {
          candidate.signal.removeEventListener("abort", candidate.onAbort);
        }
      }
      function PromiseThrottle(options) {
        var opt = options || {};
        if (typeof opt.requestsPerSecond !== "number" || !(opt.requestsPerSecond > 0)) {
          throw new TypeError("requestsPerSecond must be a positive number");
        }
        this.requestsPerSecond = opt.requestsPerSecond;
        this.promiseImplementation = opt.promiseImplementation || Promise;
        this.lastStartTime = 0;
        this.lastWeight = 0;
        this.queued = [];
        this.timer = null;
      }
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
          if (signal && typeof signal.addEventListener === "function") {
            candidate.onAbort = function() {
              self._abort(candidate);
            };
            signal.addEventListener("abort", candidate.onAbort);
          }
          self.queued.push(candidate);
          self.dequeue();
        });
      };
      PromiseThrottle.prototype.addAll = function(promises, options) {
        var addedPromises = promises.map(function(promise) {
          return this.add(promise, options);
        }.bind(this));
        return this.promiseImplementation.all(addedPromises);
      };
      PromiseThrottle.prototype.dequeue = function() {
        while (this.queued.length > 0 && !this.timer) {
          var candidate = this.queued[0];
          if (candidate.signal && candidate.signal.aborted) {
            this._abort(candidate);
            continue;
          }
          var inc = 1e3 / this.requestsPerSecond * this.lastWeight, elapsed = Date.now() - this.lastStartTime;
          if (elapsed >= inc) {
            this._execute();
          } else {
            this.timer = setTimeout(function() {
              this.timer = null;
              this.dequeue();
            }.bind(this), inc - elapsed);
          }
        }
      };
      PromiseThrottle.prototype._abort = function(candidate) {
        var index = this.queued.indexOf(candidate);
        if (index !== -1) {
          this.queued.splice(index, 1);
          removeAbortListener(candidate);
          candidate.reject(getAbortReason(candidate.signal));
        }
      };
      PromiseThrottle.prototype._execute = function() {
        var candidate = this.queued.shift();
        removeAbortListener(candidate);
        this.lastStartTime = Date.now();
        this.lastWeight = candidate.weight;
        try {
          candidate.resolve(candidate.promise());
        } catch (e) {
          candidate.reject(e);
        }
      };
      module.exports = PromiseThrottle;
    }
  });

  // lib/browser.js
  window.PromiseThrottle = require_main();
})();
