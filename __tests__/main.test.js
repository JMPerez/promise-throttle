/* global describe, it, beforeEach, afterEach, jest */

'use strict';

const assert = require('assert');
const PromiseLib = require('promise');

const PromiseThrottle = require('../lib/main');

function createPromiseThrottle(rps) {
  return new PromiseThrottle({
    requestsPerSecond: rps,
    promiseImplementation: PromiseLib
  });
}

describe('PromiseThrottle', () => {
  it('should have the following API: add(), addAll()', () => {
    assert.strictEqual(typeof PromiseThrottle.prototype.add, 'function');
    assert.strictEqual(typeof PromiseThrottle.prototype.addAll, 'function');
  });

  describe('constructor', () => {
    it('should throw when "requestsPerSecond" is not a positive number', () => {
      for (const rps of [undefined, null, 0, -1, NaN, '10']) {
        assert.throws(() => new PromiseThrottle({ requestsPerSecond: rps }), TypeError);
      }
      assert.throws(() => new PromiseThrottle(), TypeError);
    });

    it('should use the native Promise by default', async () => {
      const pt10 = new PromiseThrottle({ requestsPerSecond: 10 });
      const promise = pt10.add(() => 42);

      assert(promise instanceof Promise);
      await promise;
    });
  });

  describe('#add(fn)', () => {
    it('should return a promise of the given implementation', async () => {
      const pt10 = createPromiseThrottle(10);

      const promise = pt10.add(() => Promise.resolve());

      assert(promise instanceof PromiseLib);
      await promise;
    });

    it('should be resolved with the resolved value of the promise returned by the function', async () => {
      const pt10 = createPromiseThrottle(10);

      assert.strictEqual(await pt10.add(() => Promise.resolve(42)), 42);
    });

    it('should be resolved with the value returned by the function when it is not a promise', async () => {
      const pt10 = createPromiseThrottle(10);

      assert.strictEqual(await pt10.add(() => 42), 42);
    });

    it('should be rejected with the rejected error of the promise returned by the function', async () => {
      const pt10 = createPromiseThrottle(10);
      const fnError = new Error('Ooops!');

      await assert.rejects(pt10.add(() => Promise.reject(fnError)), (error) => error === fnError);
    });

    it('should be rejected with the error thrown by the function', async () => {
      const pt10 = createPromiseThrottle(10);
      const fnError = new Error('Ooops!');

      await assert.rejects(
        pt10.add(() => {
          throw fnError;
        }),
        (error) => error === fnError
      );
    });

    it('should be rejected with the error thrown by a queued function without affecting the rest', async () => {
      const pt100 = createPromiseThrottle(100);
      const fnError = new Error('Ooops!');

      const values = await Promise.all([
        pt100.add(() => 1),
        pt100
          .add(() => {
            throw fnError;
          })
          .catch((error) => error),
        pt100.add(() => 3)
      ]);

      assert.deepStrictEqual(values, [1, fnError, 3]);
    });
  });

  describe('#addAll([fn1, fn2, ...])', () => {
    it('should add all the functions passed as parameter', () => {
      const pt10 = createPromiseThrottle(10);
      const fn1 = () => {};
      const fn2 = () => {};
      const options = { weight: 2 };

      jest.spyOn(pt10, 'add').mockImplementation(() => {});

      pt10.addAll([fn1, fn2], options);

      assert.strictEqual(pt10.add.mock.calls.length, 2);
      assert.strictEqual(pt10.add.mock.calls[0][0], fn1);
      assert.strictEqual(pt10.add.mock.calls[0][1], options);
      assert.strictEqual(pt10.add.mock.calls[1][0], fn2);
      assert.strictEqual(pt10.add.mock.calls[1][1], options);
    });

    it('should return a promise of the given implementation', async () => {
      const pt10 = createPromiseThrottle(10);

      const promise = pt10.addAll([]);

      assert(promise instanceof PromiseLib);
      await promise;
    });

    it('should return a promise that is resolved with the proper values', async () => {
      const pt10 = createPromiseThrottle(10);

      const values = await pt10.addAll([() => Promise.resolve(12), () => Promise.resolve(34)]);

      assert.deepStrictEqual(values, [12, 34]);
    });

    it('should return a promise that is rejected whenever one of the function rejects its promise', async () => {
      const pt10 = createPromiseThrottle(10);
      const fnError = new Error('Ooops!');

      await assert.rejects(
        pt10.addAll([() => Promise.resolve(12), () => Promise.reject(fnError)]),
        (error) => error === fnError
      );
    });
  });

  describe('throttling and aborting', () => {
    let start;
    let startTimes;

    // records when it was called, relative to the beginning of the test
    const track = () => {
      startTimes.push(Date.now() - start);
      return Promise.resolve();
    };

    beforeEach(() => {
      jest.useFakeTimers();
      start = Date.now();
      startTimes = [];
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should throttle properly the function calls, respecting the number of "requestsPerSecond" option', async () => {
      const pt2 = new PromiseThrottle({ requestsPerSecond: 2 });

      const all = pt2.addAll([track, track, track, track, track]);
      await jest.advanceTimersByTimeAsync(2000);
      await all;

      assert.deepStrictEqual(startTimes, [0, 500, 1000, 1500, 2000]);
    });

    it('should keep a single timer regardless of the amount of queued functions', () => {
      const pt10 = new PromiseThrottle({ requestsPerSecond: 10 });

      for (let i = 0; i < 50; i++) {
        pt10.add(track);
      }

      assert.strictEqual(jest.getTimerCount(), 1);
    });

    it('should not throttle when "requestsPerSecond" is Infinity', () => {
      const pt = new PromiseThrottle({ requestsPerSecond: Infinity });

      pt.addAll([track, track, track]);

      assert.deepStrictEqual(startTimes, [0, 0, 0]);
      assert.strictEqual(jest.getTimerCount(), 0);
    });

    it('should delay the next call depending on the "weight" of the previous one', async () => {
      const pt2 = new PromiseThrottle({ requestsPerSecond: 2 });

      const all = Promise.all([
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

    it('should abort promises that have been queued', async () => {
      const controller = new AbortController();
      const pt = new PromiseThrottle({ requestsPerSecond: 1 });

      const first = pt.add(track, { signal: controller.signal });
      const second = pt.add(track, { signal: controller.signal });

      // calling abort should abort the second promise
      await first;
      controller.abort();

      await assert.rejects(second, { name: 'AbortError' });
      assert.deepStrictEqual(startTimes, [0]);
    });

    it('should abort promises that have been queued (using addAll)', async () => {
      const controller = new AbortController();
      const pt = new PromiseThrottle({ requestsPerSecond: 1 });

      const all = pt.addAll([track, track, track, track], { signal: controller.signal });
      controller.abort();

      await assert.rejects(all, { name: 'AbortError' });
      assert.deepStrictEqual(startTimes, [0]);
    });

    it('should only abort promises that were queued with a signal', async () => {
      const controller = new AbortController();
      const { signal } = controller;
      const pt = new PromiseThrottle({ requestsPerSecond: 10 });
      const results = [];

      const push = (value) => () => {
        results.push(value);
        return Promise.resolve();
      };

      pt.add(push(0)).then(() => controller.abort());
      const second = assert.rejects(pt.add(push(1), { signal }), { name: 'AbortError' });
      pt.add(push(2));
      const fourth = assert.rejects(pt.add(push(3), { signal }), { name: 'AbortError' });
      const last = pt.add(push(4));

      await jest.advanceTimersByTimeAsync(1000);
      await Promise.all([second, fourth, last]);

      assert.deepStrictEqual(results, [0, 2, 4]);
    });

    it('should reject as soon as the signal is aborted, without using a slot', async () => {
      const controller = new AbortController();
      const pt = new PromiseThrottle({ requestsPerSecond: 1 });

      pt.add(track);
      const aborted = assert.rejects(pt.add(track, { signal: controller.signal }), { name: 'AbortError' });
      const last = pt.add(track);

      controller.abort();
      // no need to advance the timers for the aborted promise to be rejected
      await aborted;

      await jest.advanceTimersByTimeAsync(1000);
      await last;
      assert.deepStrictEqual(startTimes, [0, 1000]);
    });

    it('should reject without calling the function when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const pt = new PromiseThrottle({ requestsPerSecond: 1 });

      await assert.rejects(pt.add(track, { signal: controller.signal }), { name: 'AbortError' });
      assert.deepStrictEqual(startTimes, []);
    });

    it('should reject with the reason passed when aborting', async () => {
      const controller = new AbortController();
      const reason = new Error('Cancelled by the user');
      const pt = new PromiseThrottle({ requestsPerSecond: 1 });

      pt.add(track);
      const promise = pt.add(track, { signal: controller.signal });
      controller.abort(reason);

      await assert.rejects(promise, (error) => error === reason);
    });

    it('should reject with an AbortError when the signal has no reason', async () => {
      const pt = new PromiseThrottle({ requestsPerSecond: 1 });

      await assert.rejects(
        pt.add(track, { signal: { aborted: true } }),
        (error) => error instanceof DOMException && error.name === 'AbortError'
      );
      assert.deepStrictEqual(startTimes, []);
    });

    it('should stop listening to the signal once the function is called', async () => {
      const controller = new AbortController();
      const { signal } = controller;
      jest.spyOn(signal, 'addEventListener');
      jest.spyOn(signal, 'removeEventListener');
      const pt = new PromiseThrottle({ requestsPerSecond: 1 });

      const all = pt.addAll([track, track], { signal });
      await jest.advanceTimersByTimeAsync(1000);
      await all;

      assert.strictEqual(signal.addEventListener.mock.calls.length, 2);
      assert.deepStrictEqual(signal.removeEventListener.mock.calls, signal.addEventListener.mock.calls);
    });

    it('should ignore abort events for functions that were already called', async () => {
      const listeners = [];
      const signal = {
        aborted: false,
        addEventListener: (type, listener) => listeners.push(listener),
        removeEventListener: () => {}
      };
      const pt = new PromiseThrottle({ requestsPerSecond: 1 });

      const first = pt.add(track, { signal });
      const last = pt.add(track);
      signal.aborted = true;
      listeners.forEach((listener) => listener());

      await jest.advanceTimersByTimeAsync(1000);
      await Promise.all([first, last]);
      assert.deepStrictEqual(startTimes, [0, 1000]);
    });
  });
});
