/* global describe, it */

'use strict';

var assert = require('assert');
var sinon = require('sinon');
var Promise = require('promise');

var PromiseThrottle = require('../lib/main');

function createPromiseThrottle(rps) {
  return new PromiseThrottle({
    requestsPerSecond: rps,
    promiseImplementation: Promise
  });
}

describe('PromiseThrottle', function() {

  beforeEach(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });

  it('should have the following API: add(), addAll()', function() {
    assert.strictEqual(typeof PromiseThrottle.prototype.add, 'function');
    assert.strictEqual(typeof PromiseThrottle.prototype.addAll, 'function');
  });

  describe('#add(fn)', function() {

    it('should return a promise', function(done) {
      var pt10 = createPromiseThrottle(10);

      var fn = function() {
        return Promise.resolve();
      };

      pt10.add(fn)
        .then(function() {
          done();
        })
        .catch(done.fail);
    });

    it('should be resolved with the resolved value of the promise returned by the function', function(done) {
      var pt10 = createPromiseThrottle(10);

      var fn = function() {
        return Promise.resolve(42);
      };

      pt10.add(fn)
        .then(function(value) {
          assert.strictEqual(value, 42);
          done();
        })
        .catch(done.fail);
    });

    it('should be rejected with the rejected error of the promise returned by the function', function(done) {
      var pt10 = createPromiseThrottle(10);

      var fnError = new Error('Ooops!');
      var fn = function() {
        return Promise.reject(fnError);
      };

      pt10.add(fn)
        .then(done.fail)
        .catch(function(error) {
          assert.strictEqual(error, fnError);
          done();
        });
    });

    it('should be rejected with the error thrown by the function', function(done) {
      var pt10 = createPromiseThrottle(10);

      var fnError = new Error('Ooops!');
      var fn = function() {
        throw fnError;
      };

      pt10.add(fn)
        .then(done.fail)
        .catch(function(error) {
          assert.strictEqual(error, fnError);
          done();
        });
    });

  });

  describe('#addAll([fn1, fn2, ...])', function() {

    it('should add all the functions passed as parameter', function() {
      var pt10 = createPromiseThrottle(10);

      var fn1 = function() {};
      var fn2 = function() {};

      sinon.stub(pt10, 'add');

      pt10.addAll([fn1, fn2]);

      assert(pt10.add.calledWith(fn1));
      assert(pt10.add.calledWith(fn2));
    });

    it('should return a promise that is resolved with the proper values', function(done) {
      var pt10 = createPromiseThrottle(10);

      var fn1 = function() {
        return Promise.resolve(12);
      };
      var fn2 = function() {
        return Promise.resolve(34);
      };

      pt10.addAll([fn1, fn2])
        .then(function(values) {
          assert.strictEqual(values[0], 12);
          assert.strictEqual(values[1], 34);
          done();
        })
        .catch(done.fail);
    });

    it('should return a promise that is rejected whenever one of the function rejects its promise', function(done) {
      var pt10 = createPromiseThrottle(10);

      var fn1 = function() {
        return Promise.resolve(12);
      };
      var fnError = new Error('Ooops!');
      var fn2 = function() {
        return Promise.resolve(fnError);
      };

      pt10.addAll([fn1, fn2])
        .then(function(values) {
          assert.strictEqual(values[0], 12);
          assert.strictEqual(values[1], fnError);
          done();
        })
        .catch(done.fail);
    });

    it('should throttle properly the function calls, respecting the number of "requestsPerSecond" option', function(done) {
      var pt2 = createPromiseThrottle(2);

      var count = 8,
        fns = [],
        resolvedCount = 0,
        resolved = [],
        fn = function() {
          resolvedCount++;
          return Promise.resolve();
        };

      while (count-- > 0) {
        fns.push(fn);
      }

      pt2.addAll(fns);

      setTimeout(function() {
        resolved.push(resolvedCount);
      }, 700);

      setTimeout(function() {
        resolved.push(resolvedCount);
      }, 1700);

      setTimeout(function() {
        resolved.push(resolvedCount);
      }, 2700);

      setTimeout(function() {
        resolved.push(resolvedCount);
        assert.deepEqual([2, 4, 6, 8], resolved);
        done();
      }, 3700);
    });


    it('should throttle depending on call "weight"', function(done) {
      var pt2 = createPromiseThrottle(2),
        begin = new Date();

      // By default weight is 1 so after this action delay should be 1/2 sec
      pt2.add(function () {
        return Promise.resolve();
      });

      // This action has weight 2 so delay ater it should be doubled (1 sec)
      pt2.add(function () {
        assert.equal(true, new Date() - begin >= 500);
        return Promise.resolve();
      }, 2);

      // This is more heavy action (weight = 4) so delay should be x4 (2 sec)
      pt2.add(function () {
        assert.equal(true, new Date() - begin >= 1500);
        return Promise.resolve();
      }, 4);

      // This action with default weight. So delay again 1/2 sec
      pt2.add(function () {
        assert.equal(true, new Date() - begin >= 3500);
        return Promise.resolve();
      });

      pt2.add(function () {
        assert.equal(true, new Date() - begin >= 4000);
        done();
        return Promise.resolve();
      });
    });
  });

});
