/* global describe, it, beforeEach, afterEach, jest */

'use strict';

var assert = require('assert');
var PromiseLib = require('promise');

var PromiseThrottle = require('../lib/main');

function createPromiseThrottle(rps) {
  return new PromiseThrottle({
    requestsPerSecond: rps,
    promiseImplementation: PromiseLib
  });
}

function shouldReject() {
  assert.fail('the promise should have been rejected');
}

describe('PromiseThrottle', function() {
  it('should have the following API: add(), addAll()', function() {
    assert.strictEqual(typeof PromiseThrottle.prototype.add, 'function');
    assert.strictEqual(typeof PromiseThrottle.prototype.addAll, 'function');
  });

  describe('constructor', function() {
    it('should throw when "requestsPerSecond" is not a positive number', function() {
      [undefined, null, 0, -1, NaN, '10'].forEach(function(rps) {
        assert.throws(function() {
          new PromiseThrottle({ requestsPerSecond: rps });
        }, TypeError);
      });
      assert.throws(function() {
        new PromiseThrottle();
      }, TypeError);
    });

    it('should use the native Promise by default', function() {
      var pt10 = new PromiseThrottle({ requestsPerSecond: 10 });
      var promise = pt10.add(function() {
        return 42;
      });

      assert(promise instanceof Promise);
      return promise;
    });
  });

  describe('#add(fn)', function() {
    it('should return a promise of the given implementation', function() {
      var pt10 = createPromiseThrottle(10);

      var promise = pt10.add(function() {
        return Promise.resolve();
      });

      assert(promise instanceof PromiseLib);
      return promise;
    });

    it('should be resolved with the resolved value of the promise returned by the function', function() {
      var pt10 = createPromiseThrottle(10);

      return pt10
        .add(function() {
          return Promise.resolve(42);
        })
        .then(function(value) {
          assert.strictEqual(value, 42);
        });
    });

    it('should be resolved with the value returned by the function when it is not a promise', function() {
      var pt10 = createPromiseThrottle(10);

      return pt10
        .add(function() {
          return 42;
        })
        .then(function(value) {
          assert.strictEqual(value, 42);
        });
    });

    it('should be rejected with the rejected error of the promise returned by the function', function() {
      var pt10 = createPromiseThrottle(10);

      var fnError = new Error('Ooops!');
      return pt10
        .add(function() {
          return Promise.reject(fnError);
        })
        .then(shouldReject, function(error) {
          assert.strictEqual(error, fnError);
        });
    });

    it('should be rejected with the error thrown by the function', function() {
      var pt10 = createPromiseThrottle(10);

      var fnError = new Error('Ooops!');
      return pt10
        .add(function() {
          throw fnError;
        })
        .then(shouldReject, function(error) {
          assert.strictEqual(error, fnError);
        });
    });

    it('should be rejected with the error thrown by a queued function without affecting the rest', function() {
      var pt100 = createPromiseThrottle(100);

      var fnError = new Error('Ooops!');
      return Promise.all([
        pt100.add(function() {
          return 1;
        }),
        pt100
          .add(function() {
            throw fnError;
          })
          .then(shouldReject, function(error) {
            return error;
          }),
        pt100.add(function() {
          return 3;
        })
      ]).then(function(values) {
        assert.deepStrictEqual(values, [1, fnError, 3]);
      });
    });
  });

  describe('#addAll([fn1, fn2, ...])', function() {
    it('should add all the functions passed as parameter', function() {
      var pt10 = createPromiseThrottle(10);

      var fn1 = function() {};
      var fn2 = function() {};
      var options = { weight: 2 };

      jest.spyOn(pt10, 'add').mockImplementation(function() {});

      pt10.addAll([fn1, fn2], options);

      assert.strictEqual(pt10.add.mock.calls.length, 2);
      assert.strictEqual(pt10.add.mock.calls[0][0], fn1);
      assert.strictEqual(pt10.add.mock.calls[0][1], options);
      assert.strictEqual(pt10.add.mock.calls[1][0], fn2);
      assert.strictEqual(pt10.add.mock.calls[1][1], options);
    });

    it('should return a promise of the given implementation', function() {
      var pt10 = createPromiseThrottle(10);

      var promise = pt10.addAll([]);

      assert(promise instanceof PromiseLib);
      return promise;
    });

    it('should return a promise that is resolved with the proper values', function() {
      var pt10 = createPromiseThrottle(10);

      var fn1 = function() {
        return Promise.resolve(12);
      };
      var fn2 = function() {
        return Promise.resolve(34);
      };

      return pt10.addAll([fn1, fn2]).then(function(values) {
        assert.deepStrictEqual(values, [12, 34]);
      });
    });

    it('should return a promise that is rejected whenever one of the function rejects its promise', function() {
      var pt10 = createPromiseThrottle(10);

      var fn1 = function() {
        return Promise.resolve(12);
      };
      var fnError = new Error('Ooops!');
      var fn2 = function() {
        return Promise.reject(fnError);
      };

      return pt10.addAll([fn1, fn2]).then(shouldReject, function(error) {
        assert.strictEqual(error, fnError);
      });
    });
  });

  describe('throttling and aborting', function() {
    var start;
    var startTimes;

    // records when it was called, relative to the beginning of the test
    function track() {
      startTimes.push(Date.now() - start);
      return Promise.resolve();
    }

    beforeEach(function() {
      jest.useFakeTimers();
      start = Date.now();
      startTimes = [];
    });

    afterEach(function() {
      jest.useRealTimers();
    });

    it('should throttle properly the function calls, respecting the number of "requestsPerSecond" option', async function() {
      var pt2 = new PromiseThrottle({ requestsPerSecond: 2 });

      var all = pt2.addAll([track, track, track, track, track]);
      await jest.advanceTimersByTimeAsync(2000);
      await all;

      assert.deepStrictEqual(startTimes, [0, 500, 1000, 1500, 2000]);
    });

    it('should keep a single timer regardless of the amount of queued functions', function() {
      var pt10 = new PromiseThrottle({ requestsPerSecond: 10 });

      for (var i = 0; i < 50; i++) {
        pt10.add(track);
      }

      assert.strictEqual(jest.getTimerCount(), 1);
    });

    it('should not throttle when "requestsPerSecond" is Infinity', function() {
      var pt = new PromiseThrottle({ requestsPerSecond: Infinity });

      pt.addAll([track, track, track]);

      assert.deepStrictEqual(startTimes, [0, 0, 0]);
      assert.strictEqual(jest.getTimerCount(), 0);
    });

    it('should delay the next call depending on the "weight" of the previous one', async function() {
      var pt2 = new PromiseThrottle({ requestsPerSecond: 2 });

      var all = Promise.all([
        // By default weight is 1 so after this action delay should be 1/2 sec
        pt2.add(track),
        // This action has weight 2 so delay after it should be doubled (1 sec)
        pt2.add(track, { weight: 2 }),
        // This is more heavy action (weight = 4) so delay should be x4 (2 sec)
        pt2.add(track, { weight: 4 }),
        // This action with default weight. So delay again 1/2 sec
        pt2.add(track),
        pt2.add(track)
      ]);
      await jest.advanceTimersByTimeAsync(4000);
      await all;

      assert.deepStrictEqual(startTimes, [0, 500, 1500, 3500, 4000]);
    });

    it('should abort promises that have been queued', async function() {
      var controller = new AbortController();
      var pt = new PromiseThrottle({ requestsPerSecond: 1 });

      var first = pt.add(track, { signal: controller.signal });
      var second = pt.add(track, { signal: controller.signal });

      // calling abort should abort the second promise
      await first;
      controller.abort();

      await assert.rejects(second, { name: 'AbortError' });
      assert.deepStrictEqual(startTimes, [0]);
    });

    it('should abort promises that have been queued (using addAll)', async function() {
      var controller = new AbortController();
      var pt = new PromiseThrottle({ requestsPerSecond: 1 });

      var all = pt.addAll([track, track, track, track], { signal: controller.signal });
      controller.abort();

      await assert.rejects(all, { name: 'AbortError' });
      assert.deepStrictEqual(startTimes, [0]);
    });

    it('should only abort promises that were queued with a signal', async function() {
      var controller = new AbortController();
      var signal = controller.signal;
      var pt = new PromiseThrottle({ requestsPerSecond: 10 });
      var results = [];

      function push(value) {
        return function() {
          results.push(value);
          return Promise.resolve();
        };
      }

      pt.add(push(0)).then(function() {
        controller.abort();
      });
      var second = assert.rejects(pt.add(push(1), { signal: signal }), { name: 'AbortError' });
      pt.add(push(2));
      var fourth = assert.rejects(pt.add(push(3), { signal: signal }), { name: 'AbortError' });
      var last = pt.add(push(4));

      await jest.advanceTimersByTimeAsync(1000);
      await Promise.all([second, fourth, last]);

      assert.deepStrictEqual(results, [0, 2, 4]);
    });

    it('should reject as soon as the signal is aborted, without using a slot', async function() {
      var controller = new AbortController();
      var pt = new PromiseThrottle({ requestsPerSecond: 1 });

      pt.add(track);
      var aborted = assert.rejects(pt.add(track, { signal: controller.signal }), { name: 'AbortError' });
      var last = pt.add(track);

      controller.abort();
      // no need to advance the timers for the aborted promise to be rejected
      await aborted;

      await jest.advanceTimersByTimeAsync(1000);
      await last;
      assert.deepStrictEqual(startTimes, [0, 1000]);
    });

    it('should reject without calling the function when the signal is already aborted', async function() {
      var controller = new AbortController();
      controller.abort();
      var pt = new PromiseThrottle({ requestsPerSecond: 1 });

      await assert.rejects(pt.add(track, { signal: controller.signal }), { name: 'AbortError' });
      assert.deepStrictEqual(startTimes, []);
    });

    it('should reject with the reason passed when aborting', async function() {
      var controller = new AbortController();
      var reason = new Error('Cancelled by the user');
      var pt = new PromiseThrottle({ requestsPerSecond: 1 });

      pt.add(track);
      var promise = pt.add(track, { signal: controller.signal });
      controller.abort(reason);

      await promise.then(shouldReject, function(error) {
        assert.strictEqual(error, reason);
      });
    });

    it('should support signals that do not dispatch events', async function() {
      var signal = { aborted: false };
      var pt = new PromiseThrottle({ requestsPerSecond: 1 });

      pt.add(track);
      var aborted = assert.rejects(pt.add(track, { signal: signal }), { name: 'AbortError' });
      var last = pt.add(track);

      signal.aborted = true;
      await jest.advanceTimersByTimeAsync(1000);
      await Promise.all([aborted, last]);

      assert.deepStrictEqual(startTimes, [0, 1000]);
    });

    it('should reject with an AbortError when DOMException is not available', async function() {
      var originalDOMException = global.DOMException;
      global.DOMException = undefined;

      try {
        var pt = new PromiseThrottle({ requestsPerSecond: 1 });
        await pt.add(track, { signal: { aborted: true } }).then(shouldReject, function(error) {
          assert(error instanceof Error);
          assert.strictEqual(error.name, 'AbortError');
        });
      } finally {
        global.DOMException = originalDOMException;
      }
    });

    it('should stop listening to the signal once the function is called', async function() {
      var controller = new AbortController();
      var signal = controller.signal;
      jest.spyOn(signal, 'addEventListener');
      jest.spyOn(signal, 'removeEventListener');
      var pt = new PromiseThrottle({ requestsPerSecond: 1 });

      var all = pt.addAll([track, track], { signal: signal });
      await jest.advanceTimersByTimeAsync(1000);
      await all;

      assert.strictEqual(signal.addEventListener.mock.calls.length, 2);
      assert.deepStrictEqual(signal.removeEventListener.mock.calls, signal.addEventListener.mock.calls);
    });

    it('should ignore abort events for functions that were already called', async function() {
      var listeners = [];
      var signal = {
        aborted: false,
        addEventListener: function(type, listener) {
          listeners.push(listener);
        },
        removeEventListener: function() {}
      };
      var pt = new PromiseThrottle({ requestsPerSecond: 1 });

      var first = pt.add(track, { signal: signal });
      var last = pt.add(track);
      signal.aborted = true;
      listeners.forEach(function(listener) {
        listener();
      });

      await jest.advanceTimersByTimeAsync(1000);
      await Promise.all([first, last]);
      assert.deepStrictEqual(startTimes, [0, 1000]);
    });
  });
});
