var assert = require('assert');
var sinon = require('sinon');
var Promise = require('promise');

var PromiseThrottle = require('../lib/main');

describe('Basic tests', function() {

  it('should work right away with a single function', function(done) {
    var pt10 = new PromiseThrottle({
      requestsPerSecond: 10,
      promiseImplementation: Promise
    });

    var fn = function() {
      return new Promise(function(resolve, reject) {
        done();
      });
    };
    pt10.add(fn);
  });

  it('should fail if the promise fails', function(done) {
    var pt10 = new PromiseThrottle({
      requestsPerSecond: 10,
      promiseImplementation: Promise
    });

    var fn = function() {
      return new Promise(function(resolve, reject) {
        throw 'Something went wrong';
      }).catch(function() {
        done();
      });
    };
    pt10.add(fn);
  });

 it('should fail if the promise fails 2', function(done) {
    var pt10 = new PromiseThrottle({
      requestsPerSecond: 10,
      promiseImplementation: Promise
    });
    return new Promise(function(resolve, reject) {
      reject('some_error');
      done();
    });
    pt10.add(fn);
  });

  it('should work adding a bunch of functions, exceeding the requestsPerSecond value', function(done) {
    this.timeout(4000);
    var pt10 = new PromiseThrottle({
      requestsPerSecond: 10,
      promiseImplementation: Promise
    });

    var count = 30,
        fns = [],
        resolved = 0,
        arrayResolved = [],
        fn = function() {
          return new Promise(function(resolve, reject) {
            resolve();
            resolved++;
          });
        };

    while (count > 0) {
      fns.push(fn);
      count--;
    }

    pt10.addAll(fns);
    setTimeout(function() {
      arrayResolved.push(resolved);
    }, 1000);

    setTimeout(function() {
      arrayResolved.push(resolved);
    }, 2000);

    setTimeout(function() {
      arrayResolved.push(resolved);
      assert.deepEqual([10, 20, 30], arrayResolved);
      done();
    }, 3500);
  });

});